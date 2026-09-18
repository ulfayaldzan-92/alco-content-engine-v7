'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Upload,
  Sparkles,
  Loader2,
  ChevronDown,
  UserCheck,
  Eye,
  Smile,
  Mic2,
  ShieldCheck,
  FileCode,
  Copy,
  Check,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  X,
  User,
} from 'lucide-react';
import {
  getActiveProjectId,
  getProjectCharacterDNA,
  saveProjectCharacterDNA,
  getProjectSavedCharacters,
  saveSingleSavedCharacter,
  deleteSingleSavedCharacter,
  getProjectActiveCharacterId,
  saveProjectActiveCharacterId,
} from '@/lib/storage';
import { CharacterDNA } from '@/lib/content-contract';
import { buildGeminiRequestHeaders } from '@/lib/client-gemini-key';
import { buildCharacterConsistencyPrompt } from '@/lib/character-prompt';

// Helper to resize and compress reference images before API call
// - Max 1024px on longest side
// - Preserves aspect ratio and AI facial feature recognition
// - Significantly reduces multimodal token consumption
const optimizeImageForDNAAnalysis = async (file: File): Promise<{ data: string; mimeType: string }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.onload = () => {
        const MAX_DIMENSION = 1024;
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          const rawBase64 = (event.target?.result as string).split(',')[1];
          resolve({ data: rawBase64, mimeType: file.type || 'image/jpeg' });
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Compress to high-quality JPEG (0.85) to retain facial details while minimizing token footprint
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const base64Data = dataUrl.split(',')[1];
        resolve({ data: base64Data, mimeType: 'image/jpeg' });
      };
      img.onerror = () => {
        const rawBase64 = (event.target?.result as string).split(',')[1];
        resolve({ data: rawBase64, mimeType: file.type || 'image/jpeg' });
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      resolve({ data: '', mimeType: file.type || 'image/jpeg' });
    };
    reader.readAsDataURL(file);
  });
};

export default function CharacterDNASection({
  onDNAUpdate,
  projectId,
  activeCharacterId,
  onSelectCharacter,
}: {
  onDNAUpdate: (dna: CharacterDNA) => void;
  projectId?: string;
  activeCharacterId?: string | null;
  onSelectCharacter?: (charId: string | null) => void;
}) {
  const targetProjectId = projectId || getActiveProjectId() || 'default';

  // Saved characters state
  const [savedCharacters, setSavedCharacters] = useState<CharacterDNA[]>([]);
  const [selectedCharId, setSelectedCharId] = useState<string | null>(activeCharacterId || null);

  // Form input state
  const [characterName, setCharacterName] = useState<string>('');
  const [additionalInstructions, setAdditionalInstructions] = useState<string>('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);

  // Status state
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState<boolean>(false);
  const [dna, setDna] = useState<CharacterDNA | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Load saved characters from project storage on mount / projectId change
  useEffect(() => {
    const list = getProjectSavedCharacters(targetProjectId) as CharacterDNA[];
    setSavedCharacters(list);

    const activeId = activeCharacterId || getProjectActiveCharacterId(targetProjectId);
    setSelectedCharId(activeId);

    if (activeId && list.length > 0) {
      const activeChar = list.find((c) => c.character_id === activeId);
      if (activeChar) {
        setDna(activeChar);
        return;
      }
    }

    // Fallback: check single character_dna
    const existing = getProjectCharacterDNA(targetProjectId);
    if (existing) {
      setDna(existing);
      if (!activeId && existing.character_id) {
        setSelectedCharId(existing.character_id);
      }
    } else if (list.length > 0) {
      setDna(list[0]);
      setSelectedCharId(list[0].character_id);
    } else {
      // Clear character DNA when switching to project with no characters
      setDna(null);
      setSelectedCharId(null);
    }
  }, [targetProjectId, activeCharacterId]);

  // Sync external activeCharacterId prop
  useEffect(() => {
    if (activeCharacterId !== undefined) {
      setSelectedCharId(activeCharacterId);
      if (activeCharacterId) {
        const found = savedCharacters.find((c) => c.character_id === activeCharacterId);
        if (found) {
          setDna(found);
        }
      }
    }
  }, [activeCharacterId, savedCharacters]);

  const handleCopy = (key: string, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files).slice(0, 3);
      setImages(selected);
      setIsRateLimited(false);
      // Generate object URLs for preview
      const previews = selected.map((file) => URL.createObjectURL(file));
      setImagePreviews(previews);
    }
  };

  const handleRemoveImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    const updatedPreviews = imagePreviews.filter((_, i) => i !== index);
    setImages(updatedImages);
    setImagePreviews(updatedPreviews);
  };

  // Generate Character DNA via Gemini
  const generateDNA = async () => {
    if (loading) return;
    if (!characterName.trim()) {
      setErrorMessage('Silakan isi Nama Karakter terlebih dahulu.');
      return;
    }
    if (images.length === 0 && !dna?.reference_images?.length) {
      setErrorMessage('Upload minimal 1 foto referensi talent untuk dianalisis.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setIsRateLimited(false);
    try {
      // Optimize & resize reference images to max 1024px to heavily save token consumption while preserving facial features
      const base64Images = await Promise.all(
        images.slice(0, 3).map((img) => optimizeImageForDNAAnalysis(img))
      );

      // Build structured prompt embedding explicit user additional instructions
      const userPrompt = `
Analyze the character's visual identity carefully.
Character Name: ${characterName.trim()}

CRITICAL USER ADDITIONAL INSTRUCTIONS (HIGHEST PRIORITY OVERRIDE):
"${additionalInstructions.trim() || 'Maintain a natural and consistent visual identity.'}"

IMPORTANT RULE: The user's explicit instructions above MUST OVERRIDE any visual assumptions from the photos. For example, if the photo shows uncovered hair but user says "Karakter selalu memakai hijab", you MUST strictly specify hijab in hair_description, wardrobe_style, locked_traits, and dna_summary_prompt.

Output a complete JSON object with the following schema:
{
  "dna": {
    "identity": {
      "display_name": "${characterName.trim()}",
      "gender_presentation": "e.g. woman / man",
      "estimated_age_range": "e.g. around 28 years old",
      "ethnicity_or_region_hint": "e.g. Indonesian",
      "body_type": "...",
      "facial_features": "...",
      "hair_description": "...",
      "skin_tone": "...",
      "distinctive_characteristics": "..."
    },
    "style": {
      "wardrobe_style": "...",
      "accessories": ["..."],
      "makeup_style": "...",
      "visual_vibe": "...",
      "brand_fit_reason": "..."
    },
    "behavior": {
      "speaking_tone": "...",
      "expression_style": "...",
      "pose_tendency": "...",
      "gesture_style": "...",
      "on_camera_persona": "..."
    },
    "consistency_rules": {
      "locked_traits": ["..."],
      "avoid_traits": ["..."],
      "continuity_notes": ["..."]
    },
    "prompt_assets": {
      "dna_summary_prompt": "...",
      "locked_visual_prompt": "...",
      "preview_generation_prompt": "...",
      "scene_reuse_prompt_template": "..."
    }
  },
  "previewImagePrompt": "Portrait of ${characterName.trim()} matching the DNA specifications"
}
`.trim();

      const response = await fetch('/api/gemini/generate-dna', {
        method: 'POST',
        headers: buildGeminiRequestHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ images: base64Images, prompt: userPrompt }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.error) {
        if (response.status === 429 || data.isRateLimit || data.error === 'RATE_LIMIT') {
          setIsRateLimited(true);
          setErrorMessage(null);
          return;
        }

        const rawMsg = data.message || data.error || '';
        const isRateRelated = typeof rawMsg === 'string' && /quota|rate.*limit|rate.*exceed|resource.*exhaust|overload|429/i.test(rawMsg);
        if (isRateRelated) {
          setIsRateLimited(true);
          setErrorMessage(null);
          return;
        }

        const msg = typeof data.message === 'string' && !/grpc|google|stack|error:|\[|resource_exhausted/i.test(data.message)
          ? data.message
          : 'Gagal menganalisis foto. Periksa koneksi atau foto Anda.';
        setErrorMessage(msg);
        return;
      }

      // ASYNC PROJECT GUARD: Discard response if user switched projects during async generation
      const currentActiveProject = getActiveProjectId();
      if (currentActiveProject && currentActiveProject !== targetProjectId) {
        console.warn(`[Async Guard] Discarding Character DNA response for stale project ${targetProjectId} (current: ${currentActiveProject})`);
        return;
      }

      const rawDna = data.dna?.dna ? data.dna.dna : data.dna || {};

      // Synthesize into robust CharacterDNA object
      const synthesizedDNA: CharacterDNA = {
        character_id: editingCharacterId || dna?.character_id || `char_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        project_id: targetProjectId,
        reference_images: base64Images.map((b) => `data:${b.mimeType};base64,${b.data}`),
        preview_image: data.previewImageBase64 || rawDna.preview_image || dna?.preview_image,
        additional_instructions: additionalInstructions.trim(),
        identity: {
          display_name: characterName.trim() || rawDna.identity?.display_name || 'Karakter Talent',
          gender_presentation: rawDna.identity?.gender_presentation || 'woman',
          estimated_age_range: rawDna.identity?.estimated_age_range || 'around 28 years old',
          ethnicity_or_region_hint: rawDna.identity?.ethnicity_or_region_hint || 'Indonesian',
          body_type: rawDna.identity?.body_type || 'proporsional',
          facial_features: rawDna.identity?.facial_features || 'ramah, natural',
          hair_description: rawDna.identity?.hair_description || (additionalInstructions.toLowerCase().includes('hijab') ? 'Hijab sopan dan rapi' : 'Rapi natural'),
          skin_tone: rawDna.identity?.skin_tone || 'kuning langsat hangat',
          distinctive_characteristics: rawDna.identity?.distinctive_characteristics || rawDna.features?.[0] || '',
        },
        style: {
          wardrobe_style: rawDna.style?.wardrobe_style || (additionalInstructions ? additionalInstructions : 'Smart casual sopan'),
          accessories: Array.isArray(rawDna.style?.accessories) ? rawDna.style.accessories : [],
          makeup_style: rawDna.style?.makeup_style || 'natural clean look',
          visual_vibe: rawDna.style?.visual_vibe || 'profesional, ramah, terpercaya',
          brand_fit_reason: rawDna.style?.brand_fit_reason || 'Mencerminkan persona brand yang autentik',
        },
        behavior: {
          speaking_tone: rawDna.behavior?.speaking_tone || 'hangat dan meyakinkan',
          expression_style: rawDna.behavior?.expression_style || 'senyum ramah dan kontak mata natural',
          pose_tendency: rawDna.behavior?.pose_tendency || 'percaya diri santai di depan kamera',
          gesture_style: rawDna.behavior?.gesture_style || 'gestur tangan komunikatif dan terkontrol',
          on_camera_persona: rawDna.behavior?.on_camera_persona || 'Kreator Edukatif & Autentik',
        },
        consistency_rules: {
          locked_traits: [
            ...(Array.isArray(rawDna.consistency_rules?.locked_traits) ? rawDna.consistency_rules.locked_traits : []),
            ...(additionalInstructions.trim() ? [`Instruksi User: ${additionalInstructions.trim()}`] : []),
          ],
          avoid_traits: Array.isArray(rawDna.consistency_rules?.avoid_traits) ? rawDna.consistency_rules.avoid_traits : ['pakaian terlalu mencolok', 'ekspresi kaku'],
          continuity_notes: Array.isArray(rawDna.consistency_rules?.continuity_notes) ? rawDna.consistency_rules.continuity_notes : [],
        },
        prompt_assets: {
          dna_summary_prompt: rawDna.prompt_assets?.dna_summary_prompt || `${characterName.trim()}, Indonesian, around 28 years old, ${additionalInstructions.trim() || 'consistent identity'}`,
          locked_visual_prompt: rawDna.prompt_assets?.locked_visual_prompt || '',
          preview_generation_prompt: rawDna.prompt_assets?.preview_generation_prompt || '',
          scene_reuse_prompt_template: rawDna.prompt_assets?.scene_reuse_prompt_template || '',
        },
        timestamps: {
          created_at: dna?.timestamps?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };

      setDna(synthesizedDNA);
      setSaveMessage('DNA berhasil dianalisis! Klik "Simpan Karakter" untuk menyimpan ke profil karakter.');
      setTimeout(() => setSaveMessage(null), 5000);
    } catch (error: any) {
      console.error('Error generating DNA:', error);
      const errStr = String(error?.message || error || '').toLowerCase();
      if (
        errStr.includes('429') ||
        errStr.includes('quota') ||
        errStr.includes('rate') ||
        errStr.includes('resource_exhausted') ||
        errStr.includes('overload') ||
        errStr.includes('unavailable')
      ) {
        setIsRateLimited(true);
        setErrorMessage(null);
      } else {
        setErrorMessage('Gagal menganalisis foto. Periksa koneksi atau foto.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Save character to reusable profiles list in storage
  const handleSaveCharacter = () => {
    if (!characterName.trim()) {
      setErrorMessage('Nama Karakter wajib diisi untuk menyimpan profil.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const charToSave: CharacterDNA = dna
        ? {
            ...dna,
            identity: {
              ...dna.identity,
              display_name: characterName.trim(),
            },
            additional_instructions: additionalInstructions.trim(),
            timestamps: {
              ...dna.timestamps,
              updated_at: new Date().toISOString(),
            },
          }
        : {
            character_id: editingCharacterId || `char_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            project_id: targetProjectId,
            reference_images: [],
            additional_instructions: additionalInstructions.trim(),
            identity: {
              display_name: characterName.trim(),
              gender_presentation: 'woman',
              estimated_age_range: 'around 28 years old',
              ethnicity_or_region_hint: 'Indonesian',
              hair_description: additionalInstructions.toLowerCase().includes('hijab') ? 'Hijab sopan' : 'Rapi natural',
              skin_tone: 'kuning langsat',
            },
            style: {
              wardrobe_style: additionalInstructions.trim() || 'Pakaian sopan rapi',
              visual_vibe: 'autentik, terpercaya',
            },
            behavior: {
              on_camera_persona: 'Kreator Autentik',
            },
            consistency_rules: {
              locked_traits: additionalInstructions.trim() ? [`Instruksi User: ${additionalInstructions.trim()}`] : [],
              avoid_traits: [],
            },
            prompt_assets: {
              dna_summary_prompt: `${characterName.trim()}, Indonesian, ${additionalInstructions.trim()}`,
              locked_visual_prompt: '',
              preview_generation_prompt: '',
              scene_reuse_prompt_template: '',
            },
            timestamps: {
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          };

      const updatedList = saveSingleSavedCharacter(targetProjectId, charToSave);
      setSavedCharacters(updatedList);
      setSelectedCharId(charToSave.character_id);
      setDna(charToSave);

      // Notify parent components
      onDNAUpdate(charToSave);
      if (onSelectCharacter) {
        onSelectCharacter(charToSave.character_id);
      }

      setEditingCharacterId(null);
      setSaveMessage(`Karakter "${charToSave.identity.display_name}" berhasil disimpan dan diaktifkan!`);
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to save character', err);
      setErrorMessage('Gagal menyimpan karakter.');
    } finally {
      setIsSaving(false);
    }
  };

  // Select active character
  const handleSelectChar = (char: CharacterDNA) => {
    setSelectedCharId(char.character_id);
    saveProjectActiveCharacterId(targetProjectId, char.character_id);
    saveProjectCharacterDNA(targetProjectId, char);
    setDna(char);
    onDNAUpdate(char);
    if (onSelectCharacter) {
      onSelectCharacter(char.character_id);
    }
    setSaveMessage(`Karakter "${char.identity?.display_name}" aktif untuk produksi.`);
    setTimeout(() => setSaveMessage(null), 3000);
  };

  // Switch to "No Character"
  const handleSelectNoCharacter = () => {
    setSelectedCharId(null);
    saveProjectActiveCharacterId(targetProjectId, null);
    if (onSelectCharacter) {
      onSelectCharacter(null);
    }
    setSaveMessage('Mode "No Character" aktif. Prompt menggunakan behavior standar.');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  // Edit an existing character
  const handleStartEdit = (char: CharacterDNA) => {
    setEditingCharacterId(char.character_id);
    setCharacterName(char.identity?.display_name || '');
    setAdditionalInstructions(char.additional_instructions || '');
    setDna(char);
    setImages([]);
    setImagePreviews([]);
    setErrorMessage(null);
    setIsRateLimited(false);
    setSaveMessage(null);
    // Scroll smoothly to form
    const formEl = document.getElementById('character-form-box');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    setEditingCharacterId(null);
    setCharacterName('');
    setAdditionalInstructions('');
    setImages([]);
    setImagePreviews([]);
    setErrorMessage(null);
    setIsRateLimited(false);
  };

  // Delete a character
  const handleDeleteChar = (charId: string, name: string) => {
    if (!window.confirm(`Hapus karakter "${name}" dari Saved Characters?`)) return;

    const updated = deleteSingleSavedCharacter(targetProjectId, charId);
    setSavedCharacters(updated);

    if (selectedCharId === charId) {
      const nextChar = updated[0] || null;
      setSelectedCharId(nextChar?.character_id || null);
      setDna(nextChar);
      if (nextChar) {
        onDNAUpdate(nextChar);
        onSelectCharacter?.(nextChar.character_id);
      } else {
        onSelectCharacter?.(null);
      }
    }

    if (editingCharacterId === charId) {
      handleCancelEdit();
    }
  };

  // Reset form to create a new character
  const handleStartNew = () => {
    setEditingCharacterId(null);
    setCharacterName('');
    setAdditionalInstructions('');
    setImages([]);
    setImagePreviews([]);
    setErrorMessage(null);
    setIsRateLimited(false);
    setSaveMessage(null);
  };

  const activeConsistencyPrompt = dna ? buildCharacterConsistencyPrompt(dna) : '';

  return (
    <div className="space-y-5 font-sans">
      {/* 1. SAVED CHARACTERS MANAGEMENT BAR */}
      <div className="bg-[#fffdf8] rounded-2xl border border-[#e7e0d4] p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#e7e0d4]/60">
          <div className="flex items-center gap-2">
            <UserCheck size={18} className="text-primary" />
            <h2 className="text-sm font-bold text-[#1f2933]">Saved Characters</h2>
            <span className="text-xs text-stone-500 font-medium">({savedCharacters.length} karakter tersimpan)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectNoCharacter}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCharId === null
                  ? 'bg-stone-800 text-white shadow-xs'
                  : 'bg-[#f6f3ee] text-stone-600 hover:text-stone-900 border border-[#e7e0d4]'
              }`}
            >
              No Character
            </button>

            <button
              type="button"
              onClick={handleStartNew}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Plus size={13} />
              <span>+ Buat Karakter Baru</span>
            </button>
          </div>
        </div>

        {/* Characters Grid / Badges */}
        {savedCharacters.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
            {savedCharacters.map((char) => {
              const isSelected = selectedCharId === char.character_id;
              return (
                <div
                  key={char.character_id}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2.5 ${
                    isSelected
                      ? 'bg-primary/5 border-primary shadow-xs ring-1 ring-primary/30'
                      : 'bg-[#f6f3ee]/80 border-[#e7e0d4] hover:bg-[#f6f3ee]'
                  }`}
                >
                  <div
                    onClick={() => handleSelectChar(char)}
                    className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#e7e0d4] overflow-hidden relative shrink-0 flex items-center justify-center border border-[#e7e0d4]">
                      {char.preview_image ? (
                        <Image
                          src={char.preview_image.startsWith('data:') ? char.preview_image : `data:image/png;base64,${char.preview_image}`}
                          alt={char.identity?.display_name || 'Character'}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <User size={16} className="text-stone-500" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-stone-900 truncate">
                          {char.identity?.display_name || 'Unnamed'}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] font-extrabold bg-primary text-white px-1.5 py-0.2 rounded uppercase">
                            Aktif
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-stone-500 block truncate">
                        {char.additional_instructions || char.identity?.gender_presentation || 'Karakter Reusable'}
                      </span>
                    </div>
                  </div>

                  {/* Action Icons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(char)}
                      className="p-1.5 text-stone-500 hover:text-primary hover:bg-[#e7e0d4]/50 rounded-lg transition"
                      title="Edit Karakter"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteChar(char.character_id, char.identity?.display_name || 'Karakter')}
                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Hapus Karakter"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-2 text-center text-xs text-stone-500 italic">
            Belum ada karakter tersimpan. Gunakan form di bawah untuk membuat dan menyimpan profil karakter baru.
          </div>
        )}
      </div>

      {/* 2. CREATE / EDIT CHARACTER WORKFLOW */}
      <div id="character-form-box" className="bg-[#fffdf8] rounded-2xl border border-[#e7e0d4] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#e7e0d4]/60">
          <div>
            <h3 className="text-sm font-bold text-[#1f2933]">
              {editingCharacterId ? `Edit Karakter: ${characterName || 'Profil'}` : '1. Buat Karakter Baru'}
            </h3>
            <p className="text-xs text-stone-500">
              Input foto referensi dan instruksi eksplisit Anda untuk konsistensi visual di seluruh prompt produksi.
            </p>
          </div>

          {editingCharacterId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="text-xs text-stone-500 hover:text-stone-800 font-medium underline cursor-pointer"
            >
              Batal Edit
            </button>
          )}
        </div>

        {/* Feedback Messages */}
        {isRateLimited ? (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-amber-900">
                Kuota Gemini API telah mencapai batas.
              </p>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Character DNA tidak dapat dianalisis sampai kuota API tersedia kembali.
              </p>
            </div>
          </div>
        ) : errorMessage ? (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2 animate-fadeIn">
            <AlertCircle size={14} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        {saveMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 size={14} className="shrink-0" />
            <span>{saveMessage}</span>
          </div>
        )}

        {/* Form Fields */}
        <div className="space-y-3.5">
          {/* Field 1: Nama Karakter */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700 block">
              Nama Karakter <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              placeholder="Contoh: Maya, Sarah, Rani, Mas Budi..."
              className="w-full px-3.5 py-2.5 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl text-xs text-stone-900 font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
            />
          </div>

          {/* Field 2: Foto Referensi Upload */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-700 block">
                Foto Referensi Talent (1–3 Foto)
              </label>
              <span className="text-[11px] text-stone-400">Format: JPG, PNG, WEBP</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="dna-upload-input"
              />
              <label
                htmlFor="dna-upload-input"
                className="cursor-pointer flex items-center gap-2 px-4 py-2.5 bg-[#f6f3ee] hover:bg-[#e7e0d4] text-stone-800 font-bold border border-[#e7e0d4] rounded-xl text-xs transition shadow-2xs"
              >
                <Upload size={14} className="text-primary" />
                <span>{images.length > 0 ? `${images.length} Foto Dipilih (Ganti)` : 'Upload Foto Referensi'}</span>
              </label>

              {/* Thumbnails of selected images */}
              {imagePreviews.map((previewUrl, idx) => (
                <div key={idx} className="relative w-12 h-12 rounded-xl overflow-hidden border border-[#e7e0d4] bg-[#f6f3ee]">
                  <Image src={previewUrl} alt={`Ref ${idx + 1}`} fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 text-white rounded-full flex items-center justify-center text-[10px] hover:bg-black"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Field 3: Instruksi Tambahan (Highest Priority Explicit User Override) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-700 block">
                Instruksi Tambahan (Prioritas Utama)
              </label>
              <span className="text-[10px] font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                Override Asumsi AI
              </span>
            </div>

            <textarea
              rows={3}
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              placeholder="Contoh: selalu memakai pakaian sopan, gunakan hijab, hindari pakaian ketat, pertahankan warna hijab netral..."
              className="w-full px-3.5 py-2.5 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl text-xs text-stone-900 font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition leading-relaxed"
            />
            <p className="text-[11px] text-stone-500 leading-normal">
              Instruksi Tambahan adalah arahan eksplisit dari Anda yang memiliki prioritas lebih tinggi daripada asumsi AI dari foto (misal: jika foto rambut terbuka namun Anda instruksikan berhijab, sistem akan mengunci hijab).
            </p>
          </div>

          {/* Action Row: Generate & Save */}
          <div className="pt-2 flex flex-wrap items-center gap-2.5 border-t border-[#e7e0d4]/60">
            <button
              type="button"
              onClick={generateDNA}
              disabled={loading || !characterName.trim() || (images.length === 0 && !dna)}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer"
            >
              {loading ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
              <span>{loading ? 'Menganalisis DNA...' : 'Generate Character DNA'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveCharacter}
              disabled={isSaving || !characterName.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1f2933] hover:bg-stone-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer"
            >
              {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
              <span>Simpan Karakter</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. CHARACTER IDENTITY & ACTIVE DNA INSPECTOR */}
      {dna && (
        <div className="space-y-4 animate-fadeIn">
          {/* Basic Identity & Master Reference */}
          <div className="bg-[#fffdf8] rounded-2xl border border-[#e7e0d4] p-5 shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              {/* Reference / Preview Image */}
              <div className="md:col-span-4 flex flex-col items-center">
                {dna.preview_image ? (
                  <div className="relative w-full aspect-square max-w-[280px] rounded-2xl overflow-hidden border border-[#e7e0d4] bg-[#f6f3ee] shadow-xs">
                    <Image
                      src={dna.preview_image.startsWith('data:') ? dna.preview_image : `data:image/png;base64,${dna.preview_image}`}
                      alt={dna.identity?.display_name || 'Character Preview'}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-square max-w-[280px] rounded-2xl border border-dashed border-[#e7e0d4] bg-[#f6f3ee] flex flex-col items-center justify-center text-stone-400 p-4 text-center">
                    <UserCheck size={32} className="text-stone-300 mb-2" />
                    <span className="text-xs font-semibold">Master Reference</span>
                  </div>
                )}
                <span className="text-[10px] text-stone-500 font-medium mt-2">
                  Visual Master Reference
                </span>
              </div>

              {/* Basic Identity Details */}
              <div className="md:col-span-8 space-y-4">
                <div className="pb-3 border-b border-[#e7e0d4] flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-stone-900">
                      {dna.identity?.display_name || 'Karakter Talent Brand'}
                    </h3>
                    <p className="text-xs text-stone-500 font-medium">
                      {dna.behavior?.on_camera_persona || dna.style?.visual_vibe || 'Kreator Autentik'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedCharId === dna.character_id ? (
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                        Aktif di Studio
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSelectChar(dna)}
                        className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-primary text-white hover:bg-blue-700 cursor-pointer"
                      >
                        Gunakan Karakter Ini
                      </button>
                    )}
                  </div>
                </div>

                {/* Primary Specs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl space-y-0.5">
                    <span className="text-[10px] font-bold text-stone-500 uppercase block">Gender &amp; Usia</span>
                    <p className="text-stone-800 font-semibold">
                      {dna.identity?.gender_presentation || '-'}, {dna.identity?.estimated_age_range || '-'}
                    </p>
                  </div>

                  <div className="p-3 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl space-y-0.5">
                    <span className="text-[10px] font-bold text-stone-500 uppercase block">Wilayah / Etnisitas</span>
                    <p className="text-stone-800 font-semibold">
                      {dna.identity?.ethnicity_or_region_hint || '-'}
                    </p>
                  </div>

                  <div className="p-3 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl space-y-0.5">
                    <span className="text-[10px] font-bold text-stone-500 uppercase block">Postur &amp; Fitur Tubuh</span>
                    <p className="text-stone-800 font-medium">
                      {dna.identity?.body_type || '-'} &bull; {dna.identity?.skin_tone || '-'}
                    </p>
                  </div>

                  <div className="p-3 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl space-y-0.5">
                    <span className="text-[10px] font-bold text-stone-500 uppercase block">Rambut / Hijab</span>
                    <p className="text-stone-800 font-medium line-clamp-1">
                      {dna.identity?.hair_description || '-'}
                    </p>
                  </div>
                </div>

                {/* Explicit Additional Instructions Callout */}
                {dna.additional_instructions && (
                  <div className="p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-xl text-xs space-y-1">
                    <span className="text-[10px] font-bold text-cyan-700 dark:text-cyan-300 uppercase block">
                      Instruksi Tambahan User (Prioritas Utama)
                    </span>
                    <p className="text-stone-800 font-medium italic">
                      &ldquo;{dna.additional_instructions}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. NATURAL LANGUAGE PROMPT CONTEXT DISPLAY */}
          <div className="bg-[#fffdf8] rounded-2xl border border-[#e7e0d4] p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-stone-900">
                  Prompt Context [CHARACTER CONSISTENCY]
                </h4>
                <p className="text-[11px] text-stone-500">
                  Format natural-language yang diinjeksikan otomatis ke prompt Image, Carousel, dan Video.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleCopy('char_consistency_prompt', activeConsistencyPrompt)}
                className="px-3 py-1.5 bg-[#f6f3ee] hover:bg-[#e7e0d4] text-primary font-bold text-xs rounded-xl border border-[#e7e0d4] flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedKey === 'char_consistency_prompt' ? (
                  <>
                    <Check size={12} />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>Salin Natural Prompt</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-3.5 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl text-stone-900 font-mono text-xs leading-relaxed select-all whitespace-pre-wrap">
              {activeConsistencyPrompt || 'Pilih karakter untuk melihat konteks prompt konsistensi.'}
            </div>
          </div>

          {/* 5. PROGRESSIVE DISCLOSURE ACCORDIONS */}
          <div className="space-y-2.5">
            {/* Visual DNA */}
            <details className="group border border-[#e7e0d4] bg-[#fffdf8] rounded-2xl overflow-hidden shadow-xs transition-all">
              <summary className="p-3.5 flex items-center justify-between font-bold text-xs text-stone-800 hover:text-primary cursor-pointer select-none">
                <div className="flex items-center gap-2">
                  <Eye size={14} className="text-primary" />
                  <span>Visual DNA &amp; Wardrobe</span>
                </div>
                <ChevronDown size={14} className="text-stone-400 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="p-4 pt-2 border-t border-[#e7e0d4]/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-stone-500 uppercase block">Gaya Busana (Wardrobe)</span>
                  <p className="text-stone-800 font-medium">{dna.style?.wardrobe_style || '-'}</p>
                </div>
                <div className="p-3 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-stone-500 uppercase block">Visual Vibe &amp; Mood</span>
                  <p className="text-stone-800 font-medium">{dna.style?.visual_vibe || '-'}</p>
                </div>
                <div className="p-3 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-stone-500 uppercase block">Makeup / Grooming</span>
                  <p className="text-stone-800 font-medium">{dna.style?.makeup_style || '-'}</p>
                </div>
                <div className="p-3 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-stone-500 uppercase block">Aksesori Khas</span>
                  <p className="text-stone-800 font-medium">{dna.style?.accessories?.join(', ') || '-'}</p>
                </div>
              </div>
            </details>

            {/* Personality DNA */}
            <details className="group border border-[#e7e0d4] bg-[#fffdf8] rounded-2xl overflow-hidden shadow-xs transition-all">
              <summary className="p-3.5 flex items-center justify-between font-bold text-xs text-stone-800 hover:text-primary cursor-pointer select-none">
                <div className="flex items-center gap-2">
                  <Smile size={14} className="text-primary" />
                  <span>Personality &amp; Behavior DNA</span>
                </div>
                <ChevronDown size={14} className="text-stone-400 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="p-4 pt-2 border-t border-[#e7e0d4]/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-stone-500 uppercase block">Ekspresi Dominan</span>
                  <p className="text-stone-800 font-medium">{dna.behavior?.expression_style || '-'}</p>
                </div>
                <div className="p-3 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-stone-500 uppercase block">Pose &amp; Gestur Tubuh</span>
                  <p className="text-stone-800 font-medium">{dna.behavior?.pose_tendency || '-'}</p>
                </div>
              </div>
            </details>

            {/* Voice / Communication DNA */}
            <details className="group border border-[#e7e0d4] bg-[#fffdf8] rounded-2xl overflow-hidden shadow-xs transition-all">
              <summary className="p-3.5 flex items-center justify-between font-bold text-xs text-stone-800 hover:text-primary cursor-pointer select-none">
                <div className="flex items-center gap-2">
                  <Mic2 size={14} className="text-primary" />
                  <span>Voice &amp; Communication DNA</span>
                </div>
                <ChevronDown size={14} className="text-stone-400 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="p-4 pt-2 border-t border-[#e7e0d4]/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-stone-500 uppercase block">Nada Bicara (Speaking Tone)</span>
                  <p className="text-stone-800 font-medium">{dna.behavior?.speaking_tone || '-'}</p>
                </div>
                <div className="p-3 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-stone-500 uppercase block">Gaya Gestur Tangan</span>
                  <p className="text-stone-800 font-medium">{dna.behavior?.gesture_style || '-'}</p>
                </div>
              </div>
            </details>

            {/* Production & Consistency Rules */}
            <details className="group border border-[#e7e0d4] bg-[#fffdf8] rounded-2xl overflow-hidden shadow-xs transition-all">
              <summary className="p-3.5 flex items-center justify-between font-bold text-xs text-stone-800 hover:text-primary cursor-pointer select-none">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-primary" />
                  <span>Production Rules &amp; Aturan Konsistensi</span>
                </div>
                <ChevronDown size={14} className="text-stone-400 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="p-4 pt-2 border-t border-[#e7e0d4]/60 space-y-3 text-xs">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-stone-500 uppercase block">Karakteristik Wajib (Locked Traits)</span>
                  <div className="flex flex-wrap gap-1.5">
                    {dna.consistency_rules?.locked_traits && dna.consistency_rules.locked_traits.length > 0 ? (
                      dna.consistency_rules.locked_traits.map((trait, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
                          &bull; {trait}
                        </span>
                      ))
                    ) : (
                      <span className="text-stone-400 italic">Belum ada aturan spesifik</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-stone-500 uppercase block">Pantangan Visual (Avoid Traits)</span>
                  <div className="flex flex-wrap gap-1.5">
                    {dna.consistency_rules?.avoid_traits && dna.consistency_rules.avoid_traits.length > 0 ? (
                      dna.consistency_rules.avoid_traits.map((trait, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-800 border border-rose-200 text-xs font-medium">
                          &times; {trait}
                        </span>
                      ))
                    ) : (
                      <span className="text-stone-400 italic">Tidak ada pantangan khusus</span>
                    )}
                  </div>
                </div>
              </div>
            </details>

            {/* Advanced Raw Data */}
            <details className="group border border-[#e7e0d4] bg-[#fffdf8] rounded-2xl overflow-hidden shadow-xs transition-all">
              <summary className="p-3.5 flex items-center justify-between font-bold text-xs text-stone-800 hover:text-primary cursor-pointer select-none">
                <div className="flex items-center gap-2">
                  <FileCode size={14} className="text-primary" />
                  <span>Raw DNA Data Schema</span>
                </div>
                <ChevronDown size={14} className="text-stone-400 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="p-4 pt-2 border-t border-[#e7e0d4]/60 space-y-2 text-xs">
                <div className="text-[#1f2933] bg-[#f6f3ee] p-3 rounded-xl border border-[#e7e0d4] text-[10px] font-mono overflow-y-auto max-h-52 custom-scrollbar">
                  <pre>{JSON.stringify(dna, null, 2)}</pre>
                </div>
              </div>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}
