'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { exportQuestionPaperDocx, toBengaliNumerals, cleanOptionText, cleanQuestionText } from '../lib/docxGenerator';
import { 
  DEFAULT_CLASSES,
  DEFAULT_CLASS_SUBJECTS,
  loadSubjectsForClass,
  saveSubjectsForClass,
  resetSubjectsForClass,
  loadClassesList,
  saveClassesList,
  loadSectionsForSubject, 
  saveSectionsForSubject, 
  resetSectionsToDefault,
  DEFAULT_CURRICULUM_PRESETS 
} from '../lib/curriculumPresets';
import { 
  getSources, 
  formatBytes 
} from '../lib/sourceStorage';
import { processSelectedSources } from '../lib/sourceProcessor';
import { 
  FileText, 
  Image as ImageIcon,
  FileCode,
  Sparkles, 
  Download, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  BookOpen, 
  GraduationCap, 
  FileCheck,
  Settings2,
  X,
  Layout,
  Columns,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Save,
  Check,
  Sliders,
  Layers,
  Edit2,
  ListPlus,
  BookMarked,
  FolderOpen,
  UploadCloud,
  HardDrive,
  ExternalLink,
  KeyRound
} from 'lucide-react';

const bnLetters = ['ক)', 'খ)', 'গ)', 'ঘ)', 'ঙ)', 'চ)', 'ছ)', 'জ)', 'ঝ)', 'ঞ)', 'ট)', 'ঠ)', 'ড)', 'ঢ)', 'ণ)'];
const bnOptPrefixes = ['ক.', 'খ.', 'গ.', 'ঘ.'];
const enLetters = ['a)', 'b)', 'c)', 'd)', 'e)', 'f)', 'g)', 'h)', 'i)', 'j)', 'k)', 'l)', 'm)', 'n)', 'o)', 'p)'];
const enRomanNumerals = ['i)', 'ii)', 'iii)', 'iv)', 'v)', 'vi)', 'vii)', 'viii)', 'ix)', 'x)'];
const enOptPrefixes = ['a.', 'b.', 'c.', 'd.'];

const cleanPoemDisplay = (text) => {
  if (!text) return '“কবিতার নাম” কবিতা লিখ কবির নামসহ ১ম ৮ লাইন।';
  return String(text).trim().replace(/^\d+[\।\.\-\s]+/, '').replace(/^[\u09E6-\u09EF]+[\।\.\-\s]+/, '');
};

const cleanCompositionDisplay = (text) => {
  if (!text) return 'Write a composition about “The Sundarbans”';
  let t = String(text).trim().replace(/^\d+[\.\।\-\s]+/, '');
  if (t.toLowerCase().startsWith('write a composition about')) {
    return t;
  }
  const match = t.match(/[“"']([^“"']+)["'”]/);
  if (match) {
    return `Write a composition about “${match[1]}”`;
  }
  return `Write a composition about “${t}”`;
};

export default function PdfQuestionGeneratorPage() {
  // Classes List
  const [classesList, setClassesList] = useState(() => loadClassesList());

  // Language & General Info
  const [language, setLanguage] = useState('bn');
  const [schoolName, setSchoolName] = useState('শওকত ভূঁইয়া চাইল্ড কেয়ার হোমস্');
  const [schoolSubtitle, setSchoolSubtitle] = useState('প্রি-ক্যাডেট চাইল্ড কেয়ার হোমস্');
  const [examTitle, setExamTitle] = useState('২য় সেমিস্টার পরীক্ষা- ২০২৬ ইং');
  const [selectedClass, setSelectedClass] = useState('পঞ্চম');
  
  // Subjects for the currently selected class
  const [subjectsList, setSubjectsList] = useState(() => loadSubjectsForClass('পঞ্চম'));
  const [selectedSubject, setSelectedSubject] = useState('বিজ্ঞান');
  const [timeAllowed, setTimeAllowed] = useState('২ ঘণ্টা');
  const [fullMarks, setFullMarks] = useState('১০০');
  
  // Layout Options
  const [docOrientation, setDocOrientation] = useState('landscape'); // 'landscape' | 'portrait'
  const [docColumns, setDocColumns] = useState(2);                   // 2 | 1
  
  // Toggle between Question Paper Preview and Answer Key Preview
  const [previewMode, setPreviewMode] = useState('question'); // 'question' | 'answer'
  
  // AI Refinement State
  const [refiningKey, setRefiningKey] = useState(null); // e.g. '0_1'
  const [customPromptOpenKey, setCustomPromptOpenKey] = useState(null);
  const [customPromptText, setCustomPromptText] = useState('');
  
  // Multi-source Selection States (PDFs, Images, Text Notes)
  const [availableSources, setAvailableSources] = useState([]);
  const [selectedSourceConfigs, setSelectedSourceConfigs] = useState({}); // { [id]: { selected: boolean, startPage: number, endPage: number } }
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  
  // Section Configuration for Current Class & Subject
  const [sectionList, setSectionList] = useState(() => loadSectionsForSubject('পঞ্চম', 'বিজ্ঞান'));
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [newSecTitle, setNewSecTitle] = useState('');
  const [newSecCount, setNewSecCount] = useState(5);
  const [newSecMarks, setNewSecMarks] = useState(1);
  const [newSecIsMcq, setNewSecIsMcq] = useState(false);
  const [newSecSourceId, setNewSecSourceId] = useState('');

  // Admin Setup Modal State
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminActiveTab, setAdminActiveTab] = useState('sections'); // 'sections' | 'subjects' | 'classes'
  const [adminClass, setAdminClass] = useState('পঞ্চম');
  const [adminSubject, setAdminSubject] = useState('বিজ্ঞান');
  const [adminClassSubjects, setAdminClassSubjects] = useState(() => loadSubjectsForClass('পঞ্চম'));
  const [adminSections, setAdminSections] = useState([]);
  const [adminStoredBooks, setAdminStoredBooks] = useState([]);
  const [adminSuccessMsg, setAdminSuccessMsg] = useState('');

  // Subject Management States inside Admin
  const [newSubjectInput, setNewSubjectInput] = useState('');
  const [editingSubjectIdx, setEditingSubjectIdx] = useState(null);
  const [editingSubjectName, setEditingSubjectName] = useState('');

  // Class Management States inside Admin
  const [newClassInput, setNewClassInput] = useState('');
  const [editingClassIdx, setEditingClassIdx] = useState(null);
  const [editingClassName, setEditingClassName] = useState('');

  // Status & AI Generation
  const [statusMessage, setStatusMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedData, setGeneratedData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [userApiKey, setUserApiKey] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');

  // Load API Key on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('gemini_api_key') || '';
      setUserApiKey(savedKey);
      setApiKeyInput(savedKey);
    }
  }, []);

  // When selectedClass changes in main UI, load that class's subjects & ensure valid subject
  useEffect(() => {
    const classSubs = loadSubjectsForClass(selectedClass);
    setSubjectsList(classSubs);
    if (!classSubs.includes(selectedSubject)) {
      setSelectedSubject(classSubs[0] || 'বাংলা');
    }
  }, [selectedClass]);

  // When selectedClass or selectedSubject changes, load question pattern
  useEffect(() => {
    if (selectedSubject) {
      const loaded = loadSectionsForSubject(selectedClass, selectedSubject);
      setSectionList(loaded);
    }
  }, [selectedClass, selectedSubject]);

  // Sync presets & subjects immediately whenever changed in Admin or another window
  useEffect(() => {
    const handlePresetsUpdated = (e) => {
      const { className, subject } = e?.detail || {};
      if (!className || !subject || (className === selectedClass && subject === selectedSubject)) {
        const loaded = loadSectionsForSubject(selectedClass, selectedSubject);
        setSectionList(loaded);
      }
    };

    const handleSubjectsUpdated = (e) => {
      const classSubs = loadSubjectsForClass(selectedClass);
      setSubjectsList(classSubs);
      if (classSubs.length > 0 && !classSubs.includes(selectedSubject)) {
        setSelectedSubject(classSubs[0]);
      }
    };

    const handleClassesUpdated = (e) => {
      const clsList = loadClassesList();
      setClassesList(clsList);
      if (clsList.length > 0 && !clsList.includes(selectedClass)) {
        setSelectedClass(clsList[0]);
      }
    };

    const handleWindowFocus = () => {
      const clsList = loadClassesList();
      setClassesList(clsList);
      let currentCls = selectedClass;
      if (clsList.length > 0 && !clsList.includes(selectedClass)) {
        currentCls = clsList[0];
        setSelectedClass(currentCls);
      }
      const classSubs = loadSubjectsForClass(currentCls);
      setSubjectsList(classSubs);
      let currentSub = selectedSubject;
      if (classSubs.length > 0 && !classSubs.includes(selectedSubject)) {
        currentSub = classSubs[0];
        setSelectedSubject(currentSub);
      }
      if (currentCls && currentSub) {
        const loaded = loadSectionsForSubject(currentCls, currentSub);
        setSectionList(loaded);
      }
    };

    window.addEventListener('exam_presets_updated', handlePresetsUpdated);
    window.addEventListener('exam_subjects_updated', handleSubjectsUpdated);
    window.addEventListener('exam_classes_updated', handleClassesUpdated);
    window.addEventListener('storage', handleWindowFocus);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('exam_presets_updated', handlePresetsUpdated);
      window.removeEventListener('exam_subjects_updated', handleSubjectsUpdated);
      window.removeEventListener('exam_classes_updated', handleClassesUpdated);
      window.removeEventListener('storage', handleWindowFocus);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [selectedClass, selectedSubject]);


  // When selectedClass or selectedSubject changes, load available sources from storage
  useEffect(() => {
    let isCancelled = false;
    async function fetchSources() {
      if (!selectedClass || !selectedSubject) return;
      setIsLoadingSources(true);
      try {
        const list = await getSources({ className: selectedClass, subject: selectedSubject });
        if (!isCancelled) {
          setAvailableSources(list);
          const configs = {};
          list.forEach((s) => {
            const hasChaps = Array.isArray(s.chapters) && s.chapters.length > 0;
            configs[s.id] = {
              selected: true,
              mode: hasChaps ? 'chapters' : 'pages',
              selectedChapterIds: hasChaps ? [s.chapters[0].id] : [],
              startPage: 1,
              endPage: s.type === 'pdf' ? Math.min(s.pageCount || 1, 5) : 1,
            };
          });
          setSelectedSourceConfigs(configs);
        }
      } catch (err) {
        console.warn('Error loading sources:', err);
      } finally {
        if (!isCancelled) setIsLoadingSources(false);
      }
    }
    fetchSources();
    return () => { isCancelled = true; };
  }, [selectedClass, selectedSubject]);

  // Sync Admin Modal when it opens or when adminClass changes
  useEffect(() => {
    if (showAdminModal) {
      const classSubs = loadSubjectsForClass(adminClass);
      setAdminClassSubjects(classSubs);
      let targetSubject = adminSubject;
      if (!classSubs.includes(adminSubject)) {
        targetSubject = classSubs[0] || 'বাংলা';
        setAdminSubject(targetSubject);
      }
      const loaded = loadSectionsForSubject(adminClass, targetSubject);
      setAdminSections(loaded);
      setAdminSuccessMsg('');
    }
  }, [showAdminModal, adminClass]);

  // Sync Admin Sections when adminSubject changes
  useEffect(() => {
    if (showAdminModal && adminSubject) {
      const loaded = loadSectionsForSubject(adminClass, adminSubject);
      setAdminSections(loaded);
    }
  }, [adminSubject]);

  // Calculate dynamic total marks
  const currentSections = generatedData?.sections || sectionList.filter(s => s.enabled);
  const totalCalculatedMarks = currentSections.reduce(
    (sum, sec) => sum + (sec.questions ? sec.questions.length : sec.count) * (sec.marksPerQuestion || 1),
    0
  );

  // Reorder sections in main sidebar (Move Up / Down)
  const handleMoveSection = (fromIndex, direction) => {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= sectionList.length) return;
    const updated = [...sectionList];
    const item = updated.splice(fromIndex, 1)[0];
    updated.splice(toIndex, 0, item);
    setSectionList(updated);
    saveSectionsForSubject(selectedClass, selectedSubject, updated);
  };

  // Delete section in main sidebar
  const handleDeleteSectionConfig = (index) => {
    const updated = sectionList.filter((_, i) => i !== index);
    setSectionList(updated);
    saveSectionsForSubject(selectedClass, selectedSubject, updated);
  };

  // Reset current subject in sidebar to standard default
  const handleResetCurrentSubject = () => {
    if (confirm(`আপনি কি "${selectedSubject}" (${selectedClass} শ্রেণি)-এর মানবন্টন জাতীয় স্ট্যান্ডার্ড মানে রিসেট করতে চান?`)) {
      const resetted = resetSectionsToDefault(selectedClass, selectedSubject);
      setSectionList(resetted);
    }
  };

  // Add custom section
  const handleAddNewSection = (e) => {
    e.preventDefault();
    if (!newSecTitle.trim()) return;

    const matchedSrc = availableSources.find((s) => s.id === newSecSourceId);
    const newSection = {
      id: `custom_${Date.now()}`,
      title: newSecTitle.trim(),
      count: Number(newSecCount) || 5,
      marksPerQuestion: Number(newSecMarks) || 1,
      enabled: true,
      isMcq: newSecIsMcq,
    };

    const updated = [...sectionList, newSection];
    setSectionList(updated);
    saveSectionsForSubject(selectedClass, selectedSubject, updated);

    setNewSecTitle('');
    setNewSecCount(5);
    setNewSecMarks(1);
    setNewSecIsMcq(false);
    setShowAddSectionModal(false);
  };

  // Admin Section Handlers
  const handleAdminMoveSection = (fromIndex, direction) => {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= adminSections.length) return;
    const updated = [...adminSections];
    const item = updated.splice(fromIndex, 1)[0];
    updated.splice(toIndex, 0, item);
    setAdminSections(updated);
  };

  const handleAdminDeleteSection = (index) => {
    const updated = adminSections.filter((_, i) => i !== index);
    setAdminSections(updated);
  };

  const handleAdminUpdateField = (index, field, value) => {
    const updated = [...adminSections];
    updated[index] = { ...updated[index], [field]: value };
    setAdminSections(updated);
  };

  const handleAdminAddSection = () => {
    const newSec = {
      id: `custom_${Date.now()}`,
      title: 'নতুন প্রশ্নের শিরোনাম',
      count: 5,
      marksPerQuestion: 2,
      enabled: true,
      isMcq: false
    };
    setAdminSections([...adminSections, newSec]);
  };

  const handleAdminSave = () => {
    saveSectionsForSubject(adminClass, adminSubject, adminSections);
    if (adminClass === selectedClass && adminSubject === selectedSubject) {
      setSectionList(JSON.parse(JSON.stringify(adminSections)));
    }
    setAdminSuccessMsg(`"${adminSubject}" (${adminClass} শ্রেণি)-এর মানবন্টন সফলভাবে সংরক্ষিত হয়েছে!`);
    setTimeout(() => setAdminSuccessMsg(''), 3500);
  };

  const handleAdminReset = () => {
    if (confirm(`"${adminSubject}" (${adminClass} শ্রেণি)-এর মানবন্টন জাতীয় স্ট্যান্ডার্ড ডিফল্ট মানে রিসেট করবেন?`)) {
      const resetted = resetSectionsToDefault(adminClass, adminSubject);
      setAdminSections(resetted);
      if (adminClass === selectedClass && adminSubject === selectedSubject) {
        setSectionList(resetted);
      }
      setAdminSuccessMsg(`"${adminSubject}" (${adminClass} শ্রেণি)-এর মানবন্টন ডিফল্টে রিসেট করা হয়েছে!`);
      setTimeout(() => setAdminSuccessMsg(''), 3500);
    }
  };

  // Subject Management Operations (Per Class!)
  const handleAddNewSubjectForClass = (e) => {
    e.preventDefault();
    const trimmed = newSubjectInput.trim();
    if (!trimmed) return;
    if (adminClassSubjects.includes(trimmed)) {
      alert(`এই বিষয়টি ইতিমধ্যে ${adminClass} শ্রেণির তালিকায় বিদ্যমান রয়েছে!`);
      return;
    }
    const updated = [...adminClassSubjects, trimmed];
    setAdminClassSubjects(updated);
    saveSubjectsForClass(adminClass, updated);
    if (adminClass === selectedClass) {
      setSubjectsList(updated);
    }
    setNewSubjectInput('');
    setAdminSubject(trimmed);
    if (adminClass === selectedClass) {
      setSelectedSubject(trimmed);
    }
    setAdminSuccessMsg(`"${trimmed}" বিষয়টি ${adminClass} শ্রেণিতে সফলভাবে যোগ করা হয়েছে!`);
    setTimeout(() => setAdminSuccessMsg(''), 3000);
  };

  const handleSaveEditSubjectForClass = (index) => {
    const trimmed = editingSubjectName.trim();
    if (!trimmed) return;
    const oldName = adminClassSubjects[index];
    if (trimmed === oldName) {
      setEditingSubjectIdx(null);
      return;
    }
    const updated = [...adminClassSubjects];
    updated[index] = trimmed;
    setAdminClassSubjects(updated);
    saveSubjectsForClass(adminClass, updated);
    if (adminClass === selectedClass) {
      setSubjectsList(updated);
      if (selectedSubject === oldName) setSelectedSubject(trimmed);
    }
    if (adminSubject === oldName) setAdminSubject(trimmed);
    setEditingSubjectIdx(null);
    setAdminSuccessMsg(`${adminClass} শ্রেণিতে বিষয়ের নাম পরিবর্তন করে "${trimmed}" রাখা হয়েছে!`);
    setTimeout(() => setAdminSuccessMsg(''), 3000);
  };

  const handleDeleteSubjectForClass = (index, subName) => {
    if (adminClassSubjects.length <= 1) {
      alert(`${adminClass} শ্রেণিতে কমপক্ষে একটি বিষয় থাকতে হবে!`);
      return;
    }
    if (!confirm(`আপনি কি "${subName}" বিষয়টি শুধুমাত্র ${adminClass} শ্রেণি থেকে মুছে ফেলতে চান?`)) return;
    const updated = adminClassSubjects.filter((_, i) => i !== index);
    setAdminClassSubjects(updated);
    saveSubjectsForClass(adminClass, updated);
    if (adminClass === selectedClass) {
      setSubjectsList(updated);
      if (selectedSubject === subName) setSelectedSubject(updated[0]);
    }
    if (adminSubject === subName) setAdminSubject(updated[0]);
    setAdminSuccessMsg(`"${subName}" বিষয়টি ${adminClass} শ্রেণি থেকে ডিলিট করা হয়েছে!`);
    setTimeout(() => setAdminSuccessMsg(''), 3000);
  };

  const handleResetSubjectsForClass = () => {
    if (!confirm(`আপনি কি ${adminClass} শ্রেণির বিষয়সমূহকে জাতীয় আদর্শ ডিফল্ট তালিকায় ফিরিয়ে নিতে চান?`)) return;
    const reset = resetSubjectsForClass(adminClass);
    setAdminClassSubjects(reset);
    if (adminClass === selectedClass) {
      setSubjectsList(reset);
      if (!reset.includes(selectedSubject)) setSelectedSubject(reset[0]);
    }
    if (!reset.includes(adminSubject)) setAdminSubject(reset[0]);
    setAdminSuccessMsg(`${adminClass} শ্রেণির বিষয়সমূহ ডিফল্টে রিসেট করা হয়েছে!`);
    setTimeout(() => setAdminSuccessMsg(''), 3000);
  };

  // Class Management Operations
  const handleAddNewClass = (e) => {
    e.preventDefault();
    const trimmed = newClassInput.trim();
    if (!trimmed) return;
    if (classesList.includes(trimmed)) {
      alert('এই শ্রেণিটি ইতিমধ্যে তালিকায় রয়েছে!');
      return;
    }
    const updated = [...classesList, trimmed];
    setClassesList(updated);
    saveClassesList(updated);
    setNewClassInput('');
    setAdminClass(trimmed);
    setSelectedClass(trimmed);
    setAdminSuccessMsg(`"${trimmed}" শ্রেণি সফলভাবে যোগ করা হয়েছে!`);
    setTimeout(() => setAdminSuccessMsg(''), 3000);
  };

  const handleSaveEditClass = (index) => {
    const trimmed = editingClassName.trim();
    if (!trimmed) return;
    const oldName = classesList[index];
    if (trimmed === oldName) {
      setEditingClassIdx(null);
      return;
    }
    const updated = [...classesList];
    updated[index] = trimmed;
    setClassesList(updated);
    saveClassesList(updated);
    if (selectedClass === oldName) setSelectedClass(trimmed);
    if (adminClass === oldName) setAdminClass(trimmed);
    setEditingClassIdx(null);
    setAdminSuccessMsg(`শ্রেণির নাম পরিবর্তন করে "${trimmed}" রাখা হয়েছে!`);
    setTimeout(() => setAdminSuccessMsg(''), 3000);
  };

  const handleDeleteClass = (index, clsName) => {
    if (classesList.length <= 1) {
      alert('কমপক্ষে একটি শ্রেণি তালিকায় থাকতে হবে!');
      return;
    }
    if (!confirm(`আপনি কি "${clsName}" শ্রেণিটি মুছে ফেলতে চান?`)) return;
    const updated = classesList.filter((_, i) => i !== index);
    setClassesList(updated);
    saveClassesList(updated);
    if (selectedClass === clsName) setSelectedClass(updated[0]);
    if (adminClass === clsName) setAdminClass(updated[0]);
    setAdminSuccessMsg(`"${clsName}" শ্রেণি মুছে ফেলা হয়েছে!`);
    setTimeout(() => setAdminSuccessMsg(''), 3000);
  };

  // Trigger Client-Side Processing & AI Generation for all selected sources
  const handleGenerateQuestions = async () => {
    const selectedItems = [];
    availableSources.forEach((src) => {
      const cfg = selectedSourceConfigs[src.id];
      if (cfg && cfg.selected) {
        if (
          src.type === 'pdf' &&
          cfg.mode === 'chapters' &&
          Array.isArray(src.chapters) &&
          src.chapters.length > 0
        ) {
          const selectedChaps = src.chapters.filter((c) =>
            (cfg.selectedChapterIds || []).includes(c.id)
          );
          if (selectedChaps.length > 0) {
            selectedItems.push({
              source: src,
              selectedChapters: selectedChaps,
            });
          } else {
            // fallback if no chapter specifically checked
            selectedItems.push({
              source: src,
              startPage: cfg.startPage || 1,
              endPage: cfg.endPage || 1,
            });
          }
        } else {
          selectedItems.push({
            source: src,
            startPage: cfg.startPage || 1,
            endPage: cfg.endPage || 1,
          });
        }
      }
    });

    const activeSections = sectionList.filter((s) => s.enabled).map((sec) => {
      const copy = { ...sec };
      if (copy.sourceId && copy.sourceId !== 'all' && copy.sourceId !== 'default') {
        const foundSrc = availableSources.find((s) => s.id === copy.sourceId);
        if (foundSrc) {
          copy.sourceTitle = foundSrc.title;
          const alreadyInSelected = selectedItems.some((item) => item.source.id === foundSrc.id);
          if (!alreadyInSelected) {
            selectedItems.push({
              source: foundSrc,
              startPage: 1,
              endPage: foundSrc.pageCount || 1,
            });
          }
        }
      }
      return copy;
    });

    if (selectedItems.length === 0) {
      setErrorMessage('অনুগ্রহ করে প্রশ্নপত্র তৈরি করতে কমপক্ষে একটি সোর্স বা অধ্যায় নির্বাচন করুন অথবা ধারার জন্য নির্দিষ্ট সোর্স সিলেক্ট করুন।');
      return;
    }

    if (activeSections.length === 0) {
      setErrorMessage('কমপক্ষে একটি সেকশন অন রাখুন।');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage('');
      setStatusMessage('নির্বাচিত সোর্সসমূহ প্রস্তুত করা হচ্ছে...');

      // Step 1: Process all selected sources (PDF pages to images, image base64, text notes)
      const { images, textSources } = await processSelectedSources(selectedItems, (msg) => {
        setStatusMessage(msg);
      });

      let fullExtractedText = '';

      // ==========================================
      // PHASE 1: Text Extraction (Chunked Map)
      // ==========================================
      if (images && images.length > 0) {
        const CHUNK_SIZE = 3;
        const chunks = [];
        for (let i = 0; i < images.length; i += CHUNK_SIZE) {
          const chunkImages = images.slice(i, i + CHUNK_SIZE);
          chunks.push({
            chunkImages,
            startPage: i + 1,
            endPage: Math.min(i + CHUNK_SIZE, images.length),
          });
        }

        const totalChunks = chunks.length;
        let chunkIdx = 0;

        for (const chunk of chunks) {
          chunkIdx++;
          const { chunkImages, startPage, endPage } = chunk;

          // Rate Limit Protection: 3-second delay between chunk requests
          if (chunkIdx > 1) {
            setStatusMessage(`রেট লিমিট বিরতি: পরবর্তী ব্যাচের জন্য ৩ সেকেন্ড অপেক্ষা করা হচ্ছে (${chunkIdx}/${totalChunks})...`);
            await new Promise((r) => setTimeout(r, 3000));
          }

          // Progress UI: Update status with current chunk and page range
          setStatusMessage(`Extracting text from pages ${startPage}-${endPage} (${chunkIdx}/${totalChunks})... Please wait`);

          try {
            const extractRes = await fetch('/api/extract-text', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                images: chunkImages,
                language,
                apiKey: userApiKey ? userApiKey.trim() : undefined,
              }),
            });

            const extractResult = await extractRes.json();

            if (!extractRes.ok) {
              throw new Error(extractResult.error || `Failed to extract text from pages ${startPage}-${endPage}.`);
            }

            if (extractResult.text) {
              fullExtractedText += '\n\n' + extractResult.text.trim();
            }
          } catch (chunkErr) {
            console.error(`Error extracting text from chunk ${chunkIdx} (pages ${startPage}-${endPage}):`, chunkErr);
            const errorMsg = chunkErr instanceof Error ? chunkErr.message : String(chunkErr);
            alert(`সতর্কতা: পৃষ্ঠা ${startPage}-${endPage} এর টেক্সট উত্তোলনে সমস্যা হয়েছে: ${errorMsg}\nঅন্যান্য পৃষ্ঠা থেকে কাজ অব্যাহত রাখা হচ্ছে...`);
          }
        }
      }

      // Append text note sources to extracted text
      if (textSources && textSources.length > 0) {
        textSources.forEach((t, idx) => {
          fullExtractedText += `\n\n--- [সংযুক্ত নোট/সোর্স ${idx + 1}: ${t.title || 'নোট'}] ---\n` + (t.text || '');
        });
      }

      if (!fullExtractedText.trim()) {
        throw new Error('সোর্স থেকে কোনো টেক্সট বা বিষয়বস্তু উত্তোলন করা সম্ভব হয়নি। অনুগ্রহ করে সোর্স চেক করুন।');
      }

      // ==========================================
      // PHASE 2: Final Question Generation (Single Request)
      // ==========================================
      setStatusMessage('Analyzing whole text and generating final questions...');

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullExtractedText: fullExtractedText.trim(),
          className: selectedClass,
          subject: selectedSubject,
          requestedSections: activeSections,
          language,
          apiKey: userApiKey ? userApiKey.trim() : undefined,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Server failed to generate questions from extracted text.');
      }

      // Clean prefix duplicates from AI output
      if (result.data && result.data.sections) {
        result.data.sections.forEach((sec) => {
          (sec.questions || []).forEach((q) => {
            q.questionText = cleanQuestionText(q.questionText);
            if (q.options && Array.isArray(q.options)) {
              q.options = q.options.slice(0, 2).map((opt) => cleanOptionText(opt));
            }
          });
        });
      }

      setGeneratedData(result.data);
      setStatusMessage('');
      setErrorMessage('');
    } catch (err) {
      console.error('Generation Catch Error:', err);
      let errorText = 'প্রশ্নপত্র তৈরি করতে সমস্যা হয়েছে। অনুগ্রহ করে সোর্স ও পৃষ্ঠা নম্বর ঠিক আছে কি না তা যাচাই করুন।';
      if (err instanceof Error && err.message) {
        errorText = err.message;
      } else if (typeof err === 'string') {
        errorText = err;
      } else if (err && typeof err === 'object' && err.message) {
        errorText = String(err.message);
      }
      setErrorMessage(errorText);
    } finally {
      setIsProcessing(false);
    }
  };

  // Save or clear user Gemini API Key
  const handleSaveApiKey = (e) => {
    e.preventDefault();
    const cleanKey = apiKeyInput.trim();
    if (cleanKey) {
      localStorage.setItem('gemini_api_key', cleanKey);
      setUserApiKey(cleanKey);
      setShowApiKeyModal(false);
      setErrorMessage('');
      alert('Gemini API Key সফলভাবে সংরক্ষিত হয়েছে!');
    } else {
      localStorage.removeItem('gemini_api_key');
      setUserApiKey('');
      setShowApiKeyModal(false);
      alert('Gemini API Key মুছে ফেলা হয়েছে (এখন .env.local এর কী ব্যবহৃত হবে)।');
    }
  };

  // Question and section title editing handlers
  const handleSectionTitleChange = (sectionIndex, newTitle) => {
    setGeneratedData((prev) => {
      if (!prev || !prev.sections) return prev;
      const updated = JSON.parse(JSON.stringify(prev));
      if (updated.sections[sectionIndex]) {
        updated.sections[sectionIndex].title = newTitle;
      }
      return updated;
    });
  };

  const cleanPoemDisplay = (text) => {
    if (!text) return '';
    return text.replace(/^[০-৯0-9]+[\।\.\-\)\s]+/, '').trim();
  };

  const handleQuestionTextChange = (sectionIndex, qIndex, newText) => {
    setGeneratedData((prev) => {
      const updated = JSON.parse(JSON.stringify(prev));
      if (updated.sections[sectionIndex]?.questions?.[qIndex]) {
        updated.sections[sectionIndex].questions[qIndex].questionText = newText;
      }
      return updated;
    });
  };

  const handleAnswerTextChange = (sectionIndex, qIndex, newAnswer) => {
    setGeneratedData((prev) => {
      const updated = JSON.parse(JSON.stringify(prev));
      updated.sections[sectionIndex].questions[qIndex].answer = newAnswer;
      return updated;
    });
  };

  const handleOptionChange = (sectionIndex, qIndex, optIndex, newOpt) => {
    setGeneratedData((prev) => {
      const updated = JSON.parse(JSON.stringify(prev));
      updated.sections[sectionIndex].questions[qIndex].options[optIndex] = newOpt;
      return updated;
    });
  };

  const handleDeleteQuestion = (sectionIndex, qIndex) => {
    setGeneratedData((prev) => {
      const updated = JSON.parse(JSON.stringify(prev));
      updated.sections[sectionIndex].questions.splice(qIndex, 1);
      return updated;
    });
  };

  const handleAddQuestion = (sectionIndex) => {
    setGeneratedData((prev) => {
      const updated = JSON.parse(JSON.stringify(prev));
      const isSecMcq = updated.sections[sectionIndex].id.includes('mcq') || (updated.sections[sectionIndex].questions[0]?.options?.length > 0);
      updated.sections[sectionIndex].questions.push({
        id: `custom_q_${Date.now()}`,
        questionText: 'এখানে নতুন প্রশ্ন লিখুন...',
        options: isSecMcq ? ['অপশন ১', 'অপশন ২'] : [],
        answer: 'সঠিক উত্তর',
      });
      return updated;
    });
  };

  // Live AI Answer Refinement Handler
  const handleRefineAnswer = async (sectionIndex, qIndex, action, customInstruction = '') => {
    const question = generatedData?.sections?.[sectionIndex]?.questions?.[qIndex];
    if (!question) return;

    const key = `${sectionIndex}_${qIndex}`;
    try {
      setRefiningKey(key);
      const res = await fetch('/api/refine-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: question.questionText,
          currentAnswer: question.answer,
          action,
          customInstruction,
          className: selectedClass,
          subject: selectedSubject,
          apiKey: userApiKey || undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'উত্তর পরিমার্জন করতে ব্যর্থ হয়েছে।');
      }

      if (result.refinedAnswer) {
        handleAnswerTextChange(sectionIndex, qIndex, result.refinedAnswer);
      }
      setCustomPromptOpenKey(null);
      setCustomPromptText('');
    } catch (err) {
      console.error('Refine Error:', err);
      const msg = err instanceof Error && err.message 
        ? err.message 
        : (typeof err === 'string' ? err : 'AI দ্বারা উত্তর পরিবর্তন করতে সমস্যা হয়েছে।');
      alert(msg);
    } finally {
      setRefiningKey(null);
    }
  };

  function AutoResizeTextarea({
    value = '',
    onChange,
    className = '',
    placeholder = '',
    rows = 1,
    minHeight = 28,
    ...props
  }) {
    const textareaRef = React.useRef(null);
  
    const adjustHeight = React.useCallback(() => {
      const node = textareaRef.current;
      if (node) {
        node.style.height = 'auto';
        node.style.height = `${Math.max(node.scrollHeight, minHeight)}px`;
      }
    }, [minHeight]);
  
    React.useEffect(() => {
      adjustHeight();
    }, [value, adjustHeight]);
  
    return (
      <textarea
        ref={textareaRef}
        value={value}
        rows={rows}
        onChange={(e) => {
          adjustHeight();
          if (onChange) onChange(e);
        }}
        className={`${className} resize-none overflow-hidden`}
        placeholder={placeholder}
        {...props}
      />
    );
  }

  // Export to DOCX with Selected Orientation & Columns
  const handleExport = (includeAnswers = false) => {
    if (!generatedData || !generatedData.sections) return;
    exportQuestionPaperDocx({
      schoolName,
      schoolSubtitle,
      className: selectedClass,
      subject: selectedSubject,
      examTitle,
      timeAllowed,
      fullMarks: fullMarks || String(totalCalculatedMarks),
      sections: generatedData.sections,
      includeAnswers,
      orientation: docOrientation,
      columnCount: docColumns,
      paperSize: 'A4',
    });
  };

  // Split sections for Preview (Left side has Header + Sec 1..6, Right side has Sec 7..10 for standard Bengali papers)
  const previewSections = generatedData?.sections || [];
  const previewSplitIndex = previewSections.length >= 8 ? 6 : Math.ceil(previewSections.length / 2);
  const leftColSections = previewSections.slice(0, previewSplitIndex);
  const rightColSections = previewSections.slice(previewSplitIndex);

  // Helper to render a question section in the Question Paper preview
  const renderQuestionPaperSection = (section, sIndex) => {
    const isEnglish = Boolean(selectedSubject && (selectedSubject.includes('ইংরেজি') || selectedSubject.toLowerCase().includes('english')));
    const qCount = section.questions ? section.questions.length : (section.count || 1);
    const markPerQ = section.marksPerQuestion !== undefined ? section.marksPerQuestion : 1;
    const totalSecMarks = Math.round(qCount * markPerQ * 10) / 10;

    const isVocab = section.id?.includes('vocab') || section.id?.includes('word_meaning') || section.title?.includes('শব্দার্থ') || section.title?.toLowerCase().includes('word meaning');
    const isSentence = section.id?.includes('sentence') || section.id?.includes('make_sentence') || section.title?.includes('বাক্য গঠন') || section.title?.toLowerCase().includes('make sentence');
    const isPoem = section.id?.includes('poem') || section.title?.includes('কবিতা');
    const isPunctuation = section.id?.includes('punctuation') || section.title?.includes('বিরাম') || section.title?.toLowerCase().includes('punctuation') || section.title?.toLowerCase().includes('capital letters');
    const isComposition = section.id?.includes('composition') || section.title?.toLowerCase().includes('composition') || section.title?.includes('রচনা');
    const isConjunct = section.id?.includes('conjunct') || section.title?.includes('যুক্তবর্ণ');
    const isInlineComma = isVocab || isSentence || isConjunct;
    const isSinglePrompt = isPunctuation || ((section.id?.includes('theme') || section.id?.includes('desc') || section.id?.includes('long') || section.title?.includes('মূলভাব') || section.title?.includes('বর্ণনামূলক')) && section.questions?.length <= 1);
    const isMatchSec = (section.id?.includes('match') || section.title?.includes('মিল') || section.title?.toLowerCase().includes('match')) && !section.title?.toLowerCase().includes('question') && !section.id?.includes('questions');
    const isMcq = section.id?.includes('mcq') || section.title?.includes('সঠিক উত্তর') || (section.questions?.[0]?.options?.length > 0);

    const isSingleMathProblem = section.questions?.length === 1 && (section.id?.startsWith('math_word') || section.id?.startsWith('math_problem') || section.id === 'math_lcm_gcd');
    const isMathGrid = (
      section.id === 'math_blank_box' ||
      section.id === 'math_mul_div' ||
      section.id === 'math_decimal_mul_div' ||
      section.title?.includes('খালি ঘর') ||
      (section.title?.includes('গুণ') && (section.title?.includes('ভাগ') || section.title?.includes('কর'))) ||
      section.title?.includes('ভাগ কর') ||
      section.title?.includes('গুণ কর') ||
      section.title?.includes('দশমিকের গুণ')
    ) && (section.questions?.length >= 4);

    const sectionNumStr = isEnglish ? `${sIndex + 1}.` : `${toBengaliNumerals(sIndex + 1)}।`;
    const secMarksStr = isEnglish ? (totalSecMarks < 10 ? `0${totalSecMarks}` : String(totalSecMarks)) : toBengaliNumerals(totalSecMarks, true);

    return (
      <div key={section.id || sIndex} className="space-y-2 pt-2">
        {/* Section Header */}
        {isSingleMathProblem ? (
          <div className="flex items-start justify-between border-b border-slate-200 pb-1">
            <div className="flex items-start space-x-1.5 flex-1 mr-2">
              <span className="text-sm font-bold text-slate-900 flex-shrink-0 pt-0.5">
                {sectionNumStr}
              </span>
              <AutoResizeTextarea
                rows={1}
                value={cleanQuestionText(section.questions?.[0]?.questionText || section.title)}
                onChange={(e) => {
                  const val = e.target.value;
                  handleQuestionTextChange(sIndex, 0, val);
                  handleSectionTitleChange(sIndex, val);
                }}
                className="text-sm font-normal text-slate-900 w-full p-1 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded border-0"
                placeholder="গাণিতিক সমস্যা লিখুন..."
              />
            </div>
            <span className="text-sm font-bold text-slate-800 flex-shrink-0 pt-0.5">
              {secMarksStr}
            </span>
          </div>
        ) : isPoem || isComposition ? (
          <div className="flex items-center justify-between border-b border-slate-200 pb-1">
            <div className="flex items-center space-x-1.5 flex-1 mr-2">
              <span className="text-sm font-bold text-slate-900 flex-shrink-0">
                {sectionNumStr}
              </span>
              <AutoResizeTextarea
                rows={1}
                value={
                  isComposition 
                    ? cleanCompositionDisplay(section.questions?.[0]?.questionText || section.title)
                    : cleanPoemDisplay(section.questions?.[0]?.questionText || section.title)
                }
                onChange={(e) => {
                  const val = e.target.value;
                  const cleaned = isComposition ? cleanCompositionDisplay(val) : cleanPoemDisplay(val);
                  handleQuestionTextChange(sIndex, 0, cleaned);
                  handleSectionTitleChange(sIndex, cleaned);
                }}
                className="text-sm font-bold text-slate-900 w-full p-1 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded border-0"
                placeholder={isComposition ? 'Write a composition about “The Sundarbans”' : 'প্রশ্ন লিখুন...'}
              />
            </div>
            <span className="text-sm font-bold text-slate-800 flex-shrink-0">
              {secMarksStr}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between border-b border-slate-200 pb-1">
            <span className="text-sm font-bold text-slate-900">
              {sectionNumStr} {section.title}
            </span>
            <span className="text-sm font-bold text-slate-800">
              {secMarksStr}
            </span>
          </div>
        )}

        {/* 1. Comma-separated single line words (শব্দার্থ, বাক্য গঠন, যুক্তবর্ণ, Word Meaning, Make Sentence) */}
        {isInlineComma ? (
          <div className="space-y-2">
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 leading-relaxed font-mono sm:font-sans">
              {section.questions?.map((q) => cleanQuestionText(q.questionText)).filter(Boolean).join(', ') || (
                <span className="text-slate-400 italic">{isEnglish ? 'No words added' : 'কোনো শব্দ নেই'}</span>
              )}
            </div>
            {/* Word Chips / Quick Editor */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {section.questions?.map((q, qIndex) => (
                <div key={q.id || qIndex} className="inline-flex items-center bg-white border border-slate-300 rounded-lg px-2 py-1 shadow-2xs">
                  <input
                    type="text"
                    value={q.questionText}
                    onChange={(e) => handleQuestionTextChange(sIndex, qIndex, e.target.value)}
                    className="text-xs font-semibold text-slate-800 w-20 sm:w-28 focus:outline-none"
                    placeholder="Word / শব্দ..."
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(sIndex, qIndex)}
                    className="text-slate-300 hover:text-red-500 ml-1 p-0.5"
                    title="মুছে ফেলুন"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => handleAddQuestion(sIndex)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center px-2 py-1 bg-indigo-50 border border-indigo-200 rounded-lg"
              >
                <Plus className="w-3 h-3 mr-0.5" /> {isEnglish ? '+ Add Word' : 'শব্দ যোগ'}
              </button>
            </div>
          </div>
        ) : isMathGrid ? (
          /* Math Equation 2-Row Grid: Row 1 (ক, খ, গ), Row 2 (ঘ, ঙ) */
          <div className="space-y-2">
            {/* Row 1: First 3 items (ক, খ, গ) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {section.questions?.slice(0, 3).map((q, qIndex) => {
                const subPrefix = isEnglish ? (enLetters[qIndex] || `${qIndex + 1})`) : (bnLetters[qIndex] || `(${qIndex + 1})`);
                return (
                  <div key={q.id || qIndex} className="flex items-center space-x-1 bg-slate-50/90 border border-slate-200 rounded-lg px-2 py-1 shadow-2xs">
                    <span className="font-bold text-slate-700 text-xs flex-shrink-0">{subPrefix}</span>
                    <AutoResizeTextarea
                      value={cleanQuestionText(q.questionText)}
                      onChange={(e) => handleQuestionTextChange(sIndex, qIndex, e.target.value)}
                      className="w-full text-xs font-semibold text-slate-900 bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 rounded px-1"
                      placeholder="সমীকরণ / হিসাব..."
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(sIndex, qIndex)}
                      className="text-slate-300 hover:text-red-500 p-0.5 flex-shrink-0"
                      title="মুছুন"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Row 2: Remaining items (ঘ, ঙ) */}
            {section.questions && section.questions.length > 3 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:w-2/3">
                {section.questions.slice(3, 5).map((q, relIdx) => {
                  const qIndex = relIdx + 3;
                  const subPrefix = isEnglish ? (enLetters[qIndex] || `${qIndex + 1})`) : (bnLetters[qIndex] || `(${qIndex + 1})`);
                  return (
                    <div key={q.id || qIndex} className="flex items-center space-x-1 bg-slate-50/90 border border-slate-200 rounded-lg px-2 py-1 shadow-2xs">
                      <span className="font-bold text-slate-700 text-xs flex-shrink-0">{subPrefix}</span>
                      <AutoResizeTextarea
                        value={cleanQuestionText(q.questionText)}
                        onChange={(e) => handleQuestionTextChange(sIndex, qIndex, e.target.value)}
                        className="w-full text-xs font-semibold text-slate-900 bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 rounded px-1"
                        placeholder="সমীকরণ / হিসাব..."
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(sIndex, qIndex)}
                        className="text-slate-300 hover:text-red-500 p-0.5 flex-shrink-0"
                        title="মুছুন"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {(!section.questions || section.questions.length < 5) && (
              <button
                type="button"
                onClick={() => handleAddQuestion(sIndex)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center pt-1"
              >
                <Plus className="w-3.5 h-3.5 mr-0.5" /> {isEnglish ? '+ Add Equation' : 'হিসাব যোগ'}
              </button>
            )}
          </div>
        ) : (isPoem || isComposition || isSingleMathProblem) ? (
          /* Poem, Composition, and Single Math Problems are fully displayed on the top header line without extra boxes */
          null
        ) : isSinglePrompt ? (
          /* 2. Single Prompt (বিরাম চিহ্ন, Composition, Punctuation, রচনা) */
          <div className="space-y-2">
            {section.questions?.map((q, qIndex) => (
              <div key={q.id || qIndex} className="flex items-start justify-between gap-2">
                <AutoResizeTextarea
                  value={q.questionText}
                  onChange={(e) => handleQuestionTextChange(sIndex, qIndex, e.target.value)}
                  rows={isPunctuation ? 3 : 2}
                  className="w-full text-sm p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-medium"
                  placeholder={isEnglish ? 'Enter prompt or paragraph...' : 'প্রশ্ন বা অনুচ্ছেদ লিখুন...'}
                />
                <button
                  onClick={() => handleDeleteQuestion(sIndex, qIndex)}
                  className="text-slate-300 hover:text-red-500 p-0.5 flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {(!section.questions || section.questions.length === 0) && (
              <button
                onClick={() => handleAddQuestion(sIndex)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center pt-1"
              >
                <Plus className="w-3.5 h-3.5 mr-0.5" /> {isEnglish ? '+ Add Prompt' : 'প্রশ্ন যোগ'}
              </button>
            )}
          </div>
        ) : isMatchSec && section.questions?.length > 0 ? (
          /* 3. Matching Table (Column A & Column B) */
          <div className="border border-slate-400 rounded-lg overflow-hidden text-xs">
            <div className="grid grid-cols-2 bg-slate-100 p-1.5 font-bold text-slate-800 border-b border-slate-400 text-center">
              <div className="border-r border-slate-400">{isEnglish ? 'Column A' : 'বামপাশ'}</div>
              <div>{isEnglish ? 'Column B' : 'ডানপাশ'}</div>
            </div>
            <div className="divide-y divide-slate-300">
              {section.questions.map((q, qIndex) => {
                const leftLabel = isEnglish ? (enLetters[qIndex] || `${qIndex + 1})`) : (bnLetters[qIndex] || `(${qIndex + 1})`);
                const rightLabel = isEnglish ? (enRomanNumerals[qIndex] || `${qIndex + 1})`) : '';
                return (
                  <div key={q.id || qIndex} className="grid grid-cols-2 text-xs">
                    <div className="p-1.5 border-r border-slate-300 flex items-center space-x-1.5">
                      <span className="font-bold text-slate-600 flex-shrink-0">{leftLabel}</span>
                      <AutoResizeTextarea
                        value={q.questionText}
                        onChange={(e) => handleQuestionTextChange(sIndex, qIndex, e.target.value)}
                        className="w-full text-xs p-1 border-0 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="p-1.5 flex items-center space-x-1.5">
                      {rightLabel && <span className="font-bold text-slate-500 text-2xs flex-shrink-0">{rightLabel}</span>}
                      <AutoResizeTextarea
                        value={q.answer}
                        onChange={(e) => handleAnswerTextChange(sIndex, qIndex, e.target.value)}
                        className="w-full text-xs p-1 border-0 focus:ring-1 focus:ring-emerald-500 text-emerald-900 font-medium"
                      />
                      <button
                        onClick={() => handleDeleteQuestion(sIndex, qIndex)}
                        className="text-slate-300 hover:text-red-500 p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* 4. Standard List Questions (শূন্যস্থান, সাধারণ প্রশ্ন, সত্য-মিথ্যা, True/False, Questions) */
          <div className="space-y-2">
            {section.questions?.map((q, qIndex) => {
              const subPrefix = isEnglish
                ? `${enLetters[qIndex] || `(${qIndex + 1})`} `
                : (isMcq ? `${toBengaliNumerals(qIndex + 1)}) ` : `${bnLetters[qIndex] || `(${qIndex + 1})`} `);
              return (
                <div key={q.id || qIndex} className="space-y-1 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-slate-700 flex-shrink-0">{subPrefix}</span>
                    <AutoResizeTextarea
                      value={q.questionText}
                      onChange={(e) => handleQuestionTextChange(sIndex, qIndex, e.target.value)}
                      rows={1}
                      className="w-full text-sm p-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      onClick={() => handleDeleteQuestion(sIndex, qIndex)}
                      className="text-slate-300 hover:text-red-500 p-0.5 flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* 2 Options for MCQs */}
                  {q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 pl-4">
                      {q.options.slice(0, 2).map((opt, optIndex) => (
                        <div key={optIndex} className="flex items-center space-x-1.5">
                          <span className="text-xs font-bold text-slate-600">
                            {isEnglish ? `${optIndex + 1}.` : (bnOptPrefixes[optIndex] || `${optIndex + 1}.`)}
                          </span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => handleOptionChange(sIndex, qIndex, optIndex, e.target.value)}
                            className="w-full text-xs px-2 py-1 border border-slate-200 rounded-lg"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <button
              onClick={() => handleAddQuestion(sIndex)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center pt-1"
            >
              <Plus className="w-3.5 h-3.5 mr-0.5" /> {isEnglish ? '+ Add Question' : 'প্রশ্ন যোগ'}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-16 font-sans">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                পিডিএফ থেকে প্রশ্নপত্র জেনারেটর
              </h1>
              <p className="text-[11px] text-slate-500">
                A4 Landscape ২-কলাম স্ট্যান্ডার্ড প্রশ্নপত্র ও উত্তরপত্র
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                setApiKeyInput(userApiKey);
                setShowApiKeyModal(true);
              }}
              className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-lg border transition shadow-2xs ${
                userApiKey 
                  ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200' 
                  : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200'
              }`}
              title="Gemini AI API Key কনফিগার করুন"
            >
              <KeyRound className="w-3.5 h-3.5 mr-1.5" />
              <span>{userApiKey ? 'API Key সেট করা আছে' : 'Gemini API Key'}</span>
            </button>

            <button
              onClick={() => {
                setAdminClass(selectedClass);
                setAdminSubject(selectedSubject);
                setAdminActiveTab('sections');
                setShowAdminModal(true);
              }}
              className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition shadow-2xs"
              title="শ্রেণিভিত্তিক বিষয় ও মানবন্টন পরিচালনা (শুধুমাত্র আপনার ব্রাউজারে সংরক্ষিত)"
            >
              <Settings2 className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              মানবন্টন ও বিষয় সেটিংস
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Configuration Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Step 1: Exam Header & Layout Settings */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center">
                <GraduationCap className="w-5 h-5 mr-2 text-indigo-600" />
                ১. হেডিং ও তথ্যসমূহ
              </h2>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">স্কুলের নাম (লাইন ১)</label>
                <input 
                  type="text" 
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full text-base px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-800"
                  placeholder="শওকত ভূঁইয়া চাইল্ড কেয়ার হোমস্"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">শাখা / সাবটাইটেল (লাইন ২)</label>
                <input 
                  type="text" 
                  value={schoolSubtitle}
                  onChange={(e) => setSchoolSubtitle(e.target.value)}
                  className="w-full text-base px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-800"
                  placeholder="প্রি-ক্যাডেট চাইল্ড কেয়ার হোমস্"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">পরীক্ষার নাম (লাইন ৩)</label>
                <input 
                  type="text" 
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  className="w-full text-base px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-800"
                  placeholder="২য় সেমিস্টার পরীক্ষা- ২০২৬ ইং"
                />
              </div>

              {/* Class & Subject Dropdowns */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">শ্রেণি</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full text-base px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-indigo-900 bg-indigo-50/40"
                  >
                    {classesList.map((cls) => (
                      <option key={cls} value={cls}>{cls} শ্রেণি</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">বিষয় ({selectedClass})</label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full text-base px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-indigo-900 bg-indigo-50/40"
                  >
                    {subjectsList.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">সময়</label>
                  <input 
                    type="text" 
                    value={timeAllowed}
                    onChange={(e) => setTimeAllowed(e.target.value)}
                    className="w-full text-base px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="২ ঘণ্টা"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">পূর্ণমান</label>
                  <input 
                    type="text" 
                    value={fullMarks}
                    onChange={(e) => setFullMarks(e.target.value)}
                    className="w-full text-base px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold"
                    placeholder="১০০"
                  />
                </div>
              </div>

              {/* Multi-Source Selection Area */}
              <div className="pt-1 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    প্রশ্ন তৈরির সোর্স নির্বাচন ({selectedClass} শ্রেণি - {selectedSubject})
                  </label>
                  <Link
                    href="/admin"
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline flex items-center"
                    title="নতুন সোর্স ফাইল আপলোড করতে অ্যাডমিনে যান"
                  >
                    + নতুন সোর্স যোগ
                  </Link>
                </div>

                {isLoadingSources ? (
                  <div className="p-4 border rounded-xl bg-slate-50 flex items-center justify-center text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin text-indigo-600" />
                    সংরক্ষিত সোর্স চেক করা হচ্ছে...
                  </div>
                ) : availableSources.length === 0 ? (
                  /* No sources found */
                  <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 text-center">
                    <p className="text-xs font-bold text-amber-900">
                      {selectedClass} শ্রেণির {selectedSubject} বিষয়ের কোনো সোর্স পাওয়া যায়নি
                    </p>
                    <p className="text-[11px] text-amber-700">
                      প্রশ্নপত্র তৈরি করতে প্রথমে অ্যাডমিন পেজ থেকে পিডিএফ, ছবি বা নোট আপলোড করুন।
                    </p>
                    <Link
                      href="/admin"
                      className="inline-flex items-center px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      অ্যাডমিন থেকে সোর্স যোগ করুন
                    </Link>
                  </div>
                ) : (
                  /* List of sources with checkboxes and page range inputs */
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
                    {availableSources.map((src) => {
                      const cfg = selectedSourceConfigs[src.id] || { selected: false, startPage: 1, endPage: 1 };

                      return (
                        <div
                          key={src.id}
                          className={`p-2.5 rounded-xl border transition space-y-2 ${
                            cfg.selected
                              ? 'bg-indigo-50/50 border-indigo-200 shadow-2xs'
                              : 'bg-slate-50 border-slate-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <label className="flex items-start space-x-2 cursor-pointer flex-1 overflow-hidden">
                              <input
                                type="checkbox"
                                checked={cfg.selected}
                                onChange={(e) => {
                                  setSelectedSourceConfigs((prev) => ({
                                    ...prev,
                                    [src.id]: {
                                      ...cfg,
                                      selected: e.target.checked,
                                    },
                                  }));
                                }}
                                className="mt-0.5 h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 flex-shrink-0"
                              />
                              <div className="overflow-hidden">
                                <div className="flex items-center space-x-1.5">
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                      src.type === 'pdf'
                                        ? 'bg-rose-100 text-rose-700'
                                        : src.type === 'image'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {src.type === 'pdf' ? 'PDF' : src.type === 'image' ? 'ছবি' : 'নোট'}
                                  </span>
                                  <span className="text-xs font-bold text-slate-900 truncate" title={src.title}>
                                    {src.title}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  {src.type === 'pdf' && `মোট পৃষ্ঠা: ${src.pageCount || 1} • `}
                                  {formatBytes(src.size)}
                                </p>
                              </div>
                            </label>
                          </div>

                          {/* PDF Options (Chapters vs Custom Page Range) */}
                          {src.type === 'pdf' && cfg.selected && (
                            <div className="pt-2 border-t border-indigo-100/80 space-y-2">
                              {Array.isArray(src.chapters) && src.chapters.length > 0 ? (
                                <div className="space-y-1.5">
                                  {/* Mode Switcher / Header */}
                                  <div className="flex items-center justify-between text-[11px] font-bold text-indigo-950">
                                    <span className="flex items-center">
                                      <BookOpen className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                                      {cfg.mode === 'chapters'
                                        ? `অধ্যায় নির্বাচন (${(cfg.selectedChapterIds || []).length}/${src.chapters.length})`
                                        : 'কাস্টম পৃষ্ঠা নির্বাচন'}
                                    </span>

                                    <div className="flex items-center space-x-1.5 text-[10px]">
                                      {cfg.mode === 'chapters' ? (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedSourceConfigs((prev) => ({
                                                ...prev,
                                                [src.id]: {
                                                  ...cfg,
                                                  selectedChapterIds: src.chapters.map((c) => c.id),
                                                },
                                              }));
                                            }}
                                            className="text-indigo-600 font-bold hover:underline"
                                          >
                                            সব
                                          </button>
                                          <span className="text-slate-300">|</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedSourceConfigs((prev) => ({
                                                ...prev,
                                                [src.id]: {
                                                  ...cfg,
                                                  selectedChapterIds: [],
                                                },
                                              }));
                                            }}
                                            className="text-slate-500 hover:text-slate-800"
                                          >
                                            মুছুন
                                          </button>
                                          <span className="text-slate-300">|</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedSourceConfigs((prev) => ({
                                                ...prev,
                                                [src.id]: { ...cfg, mode: 'pages' },
                                              }));
                                            }}
                                            className="text-slate-500 hover:text-indigo-600 underline"
                                            title="পৃষ্ঠা নম্বর দিয়ে সিলেক্ট করুন"
                                          >
                                            পৃষ্ঠা রেঞ্জ
                                          </button>
                                        </>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedSourceConfigs((prev) => ({
                                              ...prev,
                                              [src.id]: { ...cfg, mode: 'chapters' },
                                            }));
                                          }}
                                          className="text-indigo-600 font-bold hover:underline"
                                        >
                                          অধ্যায় তালিকা দেখুন
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Chapters Mode Checklist */}
                                  {cfg.mode === 'chapters' && (
                                    <div className="space-y-1 max-h-44 overflow-y-auto pr-0.5 bg-white/80 p-1.5 rounded-xl border border-indigo-100">
                                      {src.chapters.map((chap) => {
                                        const isChapChecked = (cfg.selectedChapterIds || []).includes(chap.id);
                                        return (
                                          <label
                                            key={chap.id}
                                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition ${
                                              isChapChecked
                                                ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold shadow-2xs'
                                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-medium'
                                            }`}
                                          >
                                            <div className="flex items-center space-x-2 overflow-hidden flex-1">
                                              <input
                                                type="checkbox"
                                                checked={isChapChecked}
                                                onChange={(e) => {
                                                  const currentIds = cfg.selectedChapterIds || [];
                                                  const newIds = e.target.checked
                                                    ? [...currentIds, chap.id]
                                                    : currentIds.filter((id) => id !== chap.id);
                                                  setSelectedSourceConfigs((prev) => ({
                                                    ...prev,
                                                    [src.id]: {
                                                      ...cfg,
                                                      selectedChapterIds: newIds,
                                                    },
                                                  }));
                                                }}
                                                className="h-3.5 w-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                              />
                                              <span className="truncate">{chap.title}</span>
                                            </div>
                                            <span className="text-[10px] text-indigo-700 bg-indigo-100/80 px-1.5 py-0.5 rounded ml-2 flex-shrink-0 font-semibold">
                                              পৃ: {chap.startPage}-{chap.endPage}
                                            </span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Custom Page Range Mode inside Chaptered PDF */}
                                  {cfg.mode === 'pages' && (
                                    <div className="flex items-center justify-between text-xs gap-2 bg-white p-2 rounded-lg border border-slate-200">
                                      <span className="text-[11px] font-semibold text-slate-700">পৃষ্ঠা রেঞ্জ:</span>
                                      <div className="flex items-center space-x-1.5">
                                        <input
                                          type="number"
                                          min="1"
                                          max={src.pageCount || 999}
                                          value={cfg.startPage || 1}
                                          onChange={(e) => {
                                            const val = Math.max(1, parseInt(e.target.value) || 1);
                                            setSelectedSourceConfigs((prev) => ({
                                              ...prev,
                                              [src.id]: { ...cfg, startPage: val },
                                            }));
                                          }}
                                          className="w-12 text-center text-xs px-1.5 py-1 border border-indigo-200 rounded bg-white font-bold"
                                        />
                                        <span className="text-slate-400">থেকে</span>
                                        <input
                                          type="number"
                                          min={cfg.startPage || 1}
                                          max={src.pageCount || 999}
                                          value={cfg.endPage || 1}
                                          onChange={(e) => {
                                            const val = Math.max(cfg.startPage || 1, parseInt(e.target.value) || 1);
                                            setSelectedSourceConfigs((prev) => ({
                                              ...prev,
                                              [src.id]: { ...cfg, endPage: val },
                                            }));
                                          }}
                                          className="w-12 text-center text-xs px-1.5 py-1 border border-indigo-200 rounded bg-white font-bold"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                /* No chapters defined yet - show standard page inputs + prompt to add chapters in Admin */
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-xs gap-2">
                                    <span className="text-[11px] font-semibold text-indigo-900">পৃষ্ঠা নির্বাচন:</span>
                                    <div className="flex items-center space-x-1.5">
                                      <input
                                        type="number"
                                        min="1"
                                        max={src.pageCount || 999}
                                        value={cfg.startPage || 1}
                                        onChange={(e) => {
                                          const val = Math.max(1, parseInt(e.target.value) || 1);
                                          setSelectedSourceConfigs((prev) => ({
                                            ...prev,
                                            [src.id]: { ...cfg, startPage: val },
                                          }));
                                        }}
                                        className="w-12 text-center text-xs px-1.5 py-1 border border-indigo-200 rounded bg-white font-bold"
                                      />
                                      <span className="text-slate-400">থেকে</span>
                                      <input
                                        type="number"
                                        min={cfg.startPage || 1}
                                        max={src.pageCount || 999}
                                        value={cfg.endPage || 1}
                                        onChange={(e) => {
                                          const val = Math.max(cfg.startPage || 1, parseInt(e.target.value) || 1);
                                          setSelectedSourceConfigs((prev) => ({
                                            ...prev,
                                            [src.id]: { ...cfg, endPage: val },
                                          }));
                                        }}
                                        className="w-12 text-center text-xs px-1.5 py-1 border border-indigo-200 rounded bg-white font-bold"
                                      />
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-slate-400">
                                    <Link href="/admin" className="text-indigo-600 hover:underline font-bold">
                                      + অ্যাডমিন থেকে অধ্যায়সমূহ সেট করুন
                                    </Link>
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Exam Sections Setup & Reordering */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center">
                    <Settings2 className="w-4 h-4 mr-1.5 text-indigo-600" />
                    ২. প্রশ্নের ধারা ({selectedSubject})
                  </h2>
                  <span className="text-[11px] text-slate-500">
                    {selectedClass} শ্রেণি • ক্রম পরিবর্তন করতে ⬆️ ⬇️ চাপুন
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={handleResetCurrentSubject}
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                    title="এই বিষয়ের মানবন্টন ডিফল্টে রিসেট করুন"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddSectionModal(true)}
                    className="inline-flex items-center px-2 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                  >
                    <Plus className="w-3.5 h-3.5 mr-0.5" />
                    নতুন ধারা
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {sectionList.map((sec, idx) => {
                  const secTotal = sec.count * sec.marksPerQuestion;
                  const isFirst = idx === 0;
                  const isLast = idx === sectionList.length - 1;

                  return (
                    <div key={sec.id || idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-50 transition space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 overflow-hidden flex-1 mr-2">
                          <input 
                            type="checkbox"
                            checked={sec.enabled}
                            onChange={(e) => {
                              const updated = [...sectionList];
                              updated[idx].enabled = e.target.checked;
                              setSectionList(updated);
                              saveSectionsForSubject(selectedClass, selectedSubject, updated);
                            }}
                            className="h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 flex-shrink-0"
                          />
                          <span className={`text-sm font-semibold truncate ${sec.enabled ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                            {toBengaliNumerals(idx + 1)}। {sec.title}
                          </span>
                        </div>

                        {/* Order & Action Buttons */}
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          {sec.enabled && (
                            <span className="text-[11px] font-bold text-slate-700 bg-slate-200/90 px-1.5 py-0.5 rounded-md mr-1">
                              {toBengaliNumerals(secTotal, true)}
                            </span>
                          )}
                          <button
                            type="button"
                            disabled={isFirst}
                            onClick={() => handleMoveSection(idx, -1)}
                            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-white rounded border border-transparent hover:border-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
                            title="উপরে তুলুন"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={isLast}
                            onClick={() => handleMoveSection(idx, 1)}
                            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-white rounded border border-transparent hover:border-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
                            title="নিচে নামান"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSectionConfig(idx)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-white rounded border border-transparent hover:border-slate-200"
                            title="ধারা ডিলিট করুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {sec.enabled && (
                        <div className="space-y-2 pl-6">
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="flex items-center space-x-2 bg-white p-1.5 rounded-lg border border-slate-200">
                              <span className="text-xs text-slate-500 font-medium pl-1">প্রশ্ন:</span>
                              <input 
                                type="number"
                                min="1"
                                max="30"
                                value={sec.count}
                                onChange={(e) => {
                                  const updated = [...sectionList];
                                  updated[idx].count = parseInt(e.target.value) || 1;
                                  setSectionList(updated);
                                  saveSectionsForSubject(selectedClass, selectedSubject, updated);
                                }}
                                className="w-12 text-sm text-center font-bold focus:outline-none"
                              />
                            </div>

                            <div className="flex items-center space-x-2 bg-white p-1.5 rounded-lg border border-slate-200">
                              <span className="text-xs text-slate-500 font-medium pl-1">মান/প্রশ্ন:</span>
                              <input 
                                type="number"
                                min="1"
                                max="30"
                                value={sec.marksPerQuestion}
                                onChange={(e) => {
                                  const updated = [...sectionList];
                                  updated[idx].marksPerQuestion = parseInt(e.target.value) || 1;
                                  setSectionList(updated);
                                  saveSectionsForSubject(selectedClass, selectedSubject, updated);
                                }}
                                className="w-12 text-sm text-center font-bold focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* Dedicated Source Selector for this Section */}
                          <div className="bg-white p-2 rounded-xl border border-slate-200 space-y-1 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-700 flex items-center">
                                <BookOpen className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                                এই ধারার নির্দিষ্ট সোর্স:
                              </span>
                              {sec.sourceId && sec.sourceId !== 'all' && (
                                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                                  কাস্টম সোর্স
                                </span>
                              )}
                            </div>

                            <select
                              value={sec.sourceId || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                const updated = [...sectionList];
                                updated[idx].sourceId = val || null;
                                const match = availableSources.find((s) => s.id === val);
                                updated[idx].sourceTitle = match ? match.title : null;
                                setSectionList(updated);
                                saveSectionsForSubject(selectedClass, selectedSubject, updated);
                              }}
                              className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800"
                            >
                              <option value="">📁 মেইন সোর্সসমূহ (ডিফল্ট)</option>
                              {availableSources.map((src) => (
                                <option key={src.id} value={src.id}>
                                  {src.type === 'pdf' ? '📕' : src.type === 'image' ? '🖼️' : '📝'} {src.title}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Math Mode Selector (শুধু গুণ / শুধু ভাগ / মিশ্রণ) for Section 4, 5 and arithmetic sections */}
                          {(sec.id === 'math_mul_div' || sec.id === 'math_decimal_mul_div' || (sec.title && (sec.title.includes('গুণ') || sec.title.includes('ভাগ')))) && (
                            <div className="bg-white p-2 rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                              <span className="text-[11px] font-bold text-slate-700 block">
                                গাণিতিক মোড নির্বাচন:
                              </span>
                              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...sectionList];
                                    const isDecimal = sec.id === 'math_decimal_mul_div' || sec.title.includes('দশমিক');
                                    updated[idx].mathMode = 'multiply';
                                    updated[idx].title = isDecimal ? 'দশমিকের গুণ কর' : 'গুণ কর';
                                    setSectionList(updated);
                                    saveSectionsForSubject(selectedClass, selectedSubject, updated);
                                  }}
                                  className={`text-[11px] font-bold py-1 px-1 rounded-md transition text-center ${
                                    sec.mathMode === 'multiply' || (sec.title?.includes('গুণ') && !sec.title?.includes('ভাগ'))
                                      ? 'bg-indigo-600 text-white shadow-2xs'
                                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                                  }`}
                                >
                                  শুধু গুণ
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...sectionList];
                                    const isDecimal = sec.id === 'math_decimal_mul_div' || sec.title.includes('দশমিক');
                                    updated[idx].mathMode = 'divide';
                                    updated[idx].title = isDecimal ? 'দশমিকের ভাগ কর' : 'ভাগ কর';
                                    setSectionList(updated);
                                    saveSectionsForSubject(selectedClass, selectedSubject, updated);
                                  }}
                                  className={`text-[11px] font-bold py-1 px-1 rounded-md transition text-center ${
                                    sec.mathMode === 'divide' || (sec.title?.includes('ভাগ') && !sec.title?.includes('গুণ'))
                                      ? 'bg-indigo-600 text-white shadow-2xs'
                                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                                  }`}
                                >
                                  শুধু ভাগ
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...sectionList];
                                    const isDecimal = sec.id === 'math_decimal_mul_div' || sec.title.includes('দশমিক');
                                    updated[idx].mathMode = 'mixture';
                                    updated[idx].title = isDecimal ? 'দশমিকের গুণ ও ভাগ কর' : 'গুণ / ভাগ কর (বা উভয়টির মিশ্রণ)';
                                    setSectionList(updated);
                                    saveSectionsForSubject(selectedClass, selectedSubject, updated);
                                  }}
                                  className={`text-[11px] font-bold py-1 px-1 rounded-md transition text-center ${
                                    sec.mathMode === 'mixture' || (sec.title?.includes('গুণ') && sec.title?.includes('ভাগ')) || (!sec.mathMode)
                                      ? 'bg-indigo-600 text-white shadow-2xs'
                                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                                  }`}
                                >
                                  মিশ্রণ
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Generate Button */}
              {(() => {
                const hasSelectedSources = Object.values(selectedSourceConfigs).some((c) => c.selected) || sectionList.some((s) => s.enabled && s.sourceId);
                return (
                  <button
                    onClick={handleGenerateQuestions}
                    disabled={isProcessing || !hasSelectedSources}
                    className={`w-full mt-4 flex items-center justify-center py-3 px-4 rounded-xl text-sm font-bold text-white shadow-xs transition-all ${
                      isProcessing || !hasSelectedSources
                        ? 'bg-slate-400 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99]'
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        প্রশ্ন তৈরি হচ্ছে...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        প্রশ্নপত্র তৈরি করুন
                      </>
                    )}
                  </button>
                );
              })()}

              {statusMessage && (
                <p className="text-sm text-center text-indigo-600 font-semibold animate-pulse">{statusMessage}</p>
              )}

              {errorMessage && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2.5 text-sm text-rose-800">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5 text-rose-600" />
                    <span className="font-medium leading-relaxed">{errorMessage}</span>
                  </div>
                  {(errorMessage.includes('API Key') || errorMessage.includes('401') || errorMessage.includes('UNAUTHENTICATED') || errorMessage.includes('credentials')) && (
                    <div className="pt-2 border-t border-rose-200 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setApiKeyInput(userApiKey);
                          setShowApiKeyModal(true);
                        }}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-lg transition shadow-2xs"
                      >
                        <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                        এখানে API Key বসান
                      </button>
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center text-xs font-bold text-rose-700 hover:underline"
                      >
                        ফ্রি API Key তৈরি করুন (Google AI Studio)
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Right Area: Authentic A4 Landscape 2-Column Live Document Preview & Answer Editor */}
          <div className="lg:col-span-8 w-full min-w-0">
            {generatedData ? (
              <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden min-h-[850px] flex flex-col">
                {/* Top Action & View Toggle Bar */}
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3.5">
                  
                  {/* Toggle Switch: Question Paper vs Answer Key */}
                  <div className="inline-flex p-1 bg-slate-200/90 rounded-xl border border-slate-300 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setPreviewMode('question')}
                      className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        previewMode === 'question'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <FileText className="w-4 h-4 mr-2 text-indigo-600" />
                      প্রশ্নপত্র ভিউ
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode('answer')}
                      className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        previewMode === 'answer'
                          ? 'bg-white text-emerald-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
                      উত্তরমালা ভিউ (লাইভ এডিট ও AI)
                    </button>
                  </div>

                  {/* Export Buttons */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleExport(false)}
                      className="inline-flex items-center px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
                    >
                      <Download className="w-4 h-4 mr-1.5" />
                      প্রশ্নপত্র DOCX
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport(true)}
                      className="inline-flex items-center px-4 py-2 text-xs font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-300 rounded-xl shadow-xs transition"
                    >
                      <FileCheck className="w-4 h-4 mr-1.5 text-emerald-600" />
                      উত্তরমালা সহ DOCX
                    </button>
                  </div>
                </div>

                {/* Sub-Header info bar */}
                <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-slate-800">
                      মোট পূর্ণমান: {toBengaliNumerals(fullMarks || totalCalculatedMarks)}
                    </span>
                    <span>•</span>
                    <span>A4 Landscape ২-কলাম প্রশ্নপত্র</span>
                  </div>
                  {previewMode === 'answer' && (
                    <span className="text-emerald-700 font-bold bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                      ✨ উত্তরের পাশে AI দিয়ে বড়/ছোট বা কাস্টমাইজ করুন
                    </span>
                  )}
                </div>

                {/* Document Canvas Container */}
                <div className="p-6 md:p-8 space-y-6 flex-1 overflow-y-auto bg-slate-100/60 min-h-[700px]">
                  
                  {previewMode === 'question' ? (
                    /* ==================== 1. QUESTION PAPER PREVIEW ==================== */
                    <div className="w-full bg-white p-6 sm:p-8 rounded-xl border border-slate-300 shadow-xs space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                        
                        {/* Left Column (Header + Sections 1 to 6) */}
                        <div className="space-y-4 pr-0 md:pr-4">
                          {/* Header Box on Left Column */}
                          <div className="text-center space-y-1 pb-3">
                            <h2 className="text-lg font-bold text-slate-900 leading-tight">{schoolName}</h2>
                            {schoolSubtitle && <p className="text-sm font-semibold text-slate-700">{schoolSubtitle}</p>}
                            <p className="text-sm font-bold text-slate-800 pt-0.5">{examTitle}</p>
                            <p className="text-sm font-bold text-slate-800">
                              {selectedSubject && (selectedSubject.includes('ইংরেজি') || selectedSubject.toLowerCase().includes('english'))
                                ? `Subject- ${selectedSubject}`
                                : `বিষয়: ${selectedSubject}`}
                            </p>
                            <p className="text-sm font-bold text-slate-800 pb-1">
                              {selectedSubject && (selectedSubject.includes('ইংরেজি') || selectedSubject.toLowerCase().includes('english'))
                                ? `Class- ${selectedClass === 'পঞ্চম' ? 'Five' : selectedClass}`
                                : `শ্রেণি: ${selectedClass}`}
                            </p>

                            {/* Time & Full Marks Bar */}
                            <div className="flex items-center justify-between text-sm font-medium text-slate-800 pt-2 border-t border-slate-100 px-1">
                              <span>
                                {selectedSubject && (selectedSubject.includes('ইংরেজি') || selectedSubject.toLowerCase().includes('english'))
                                  ? `Time: ${timeAllowed}`
                                  : `সময়: ${timeAllowed}`}
                              </span>
                              <span>
                                {selectedSubject && (selectedSubject.includes('ইংরেজি') || selectedSubject.toLowerCase().includes('english'))
                                  ? `Full marks: ${fullMarks || totalCalculatedMarks}`
                                  : `পূর্ণমান: ${toBengaliNumerals(fullMarks || totalCalculatedMarks)}`}
                              </span>
                            </div>
                          </div>

                          {/* Left Sections */}
                          {leftColSections.map((section, sIndex) => renderQuestionPaperSection(section, sIndex))}
                        </div>

                        {/* Right Column (Sections 7 to 10) */}
                        <div className="space-y-4 pt-4 md:pt-0 pl-0 md:pl-4">
                          {rightColSections.map((section, rIndex) => {
                            const sIndex = previewSplitIndex + rIndex;
                            return renderQuestionPaperSection(section, sIndex);
                          })}
                        </div>

                      </div>
                    </div>
                  ) : (
                    /* ==================== 2. ANSWER KEY & LIVE AI EDITOR VIEW ==================== */
                    <div className="w-full bg-white p-6 sm:p-8 rounded-xl border border-slate-300 shadow-xs space-y-6">
                      {/* Answer Key Header */}
                      <div className="text-center pb-4 border-b border-slate-200 space-y-1">
                        <h2 className="text-xl font-bold text-red-700">{examTitle} - উত্তরমালা</h2>
                        <p className="text-sm font-semibold text-slate-700">
                          বিষয়: {selectedSubject} | শ্রেণি: {selectedClass} | পূর্ণমান: {toBengaliNumerals(fullMarks || totalCalculatedMarks)}
                        </p>
                      </div>

                      {/* Answer Sections */}
                      <div className="space-y-6">
                        {previewSections.map((section, sIndex) => {
                          const isVocab = section.id?.includes('vocab') || section.id?.includes('word_meaning') || section.title?.includes('শব্দার্থ') || section.title?.includes('শব্দের অর্থ') || section.title?.toLowerCase().includes('word meaning');
                          const isSentence = section.id?.includes('sentence') || section.id?.includes('make_sentence') || section.title?.includes('বাক্য') || section.title?.toLowerCase().includes('make sentence');
                          const isPoem = section.id?.includes('poem') || section.title?.includes('কবিতা');
                          const isPunctuation = section.id?.includes('punctuation') || section.title?.includes('বিরাম') || section.title?.includes('যতি') || section.title?.toLowerCase().includes('punctuation') || section.title?.toLowerCase().includes('capital');
                          const isConjunct = section.id?.includes('conjunct') || section.title?.includes('যুক্তবর্ণ');
                          const isFib = section.id?.includes('fib') || section.title?.includes('শূন্যস্থান') || section.title?.toLowerCase().includes('fill in');
                          const isTf = section.id?.includes('tf') || section.title?.includes('সত্য') || section.title?.toLowerCase().includes('true');
                          const isMatchSec = section.id?.includes('match') || section.title?.includes('মিল') || section.title?.toLowerCase().includes('match');
                          const isMcq = section.id?.includes('mcq') || section.title?.includes('সঠিক উত্তর') || (section.questions?.[0]?.options?.length > 0);
                          const isOral = section.id?.includes('oral') || section.title?.includes('মৌখিক');
                          
                          const isSinglePrompt = isPoem || isPunctuation || ((section.id?.includes('theme') || section.id?.includes('long') || section.title?.includes('মূলভাব') || section.title?.includes('রচনা') || section.title?.includes('বর্ণনামূলক')) && section.questions?.length <= 1);
                          
                          const isShortQuestion = section.id?.includes('short') || section.title?.includes('সংক্ষেপ') || section.title?.includes('সংক্ষিপ্ত') || section.title?.includes('ছোট');
                          const isLongQuestion = section.id?.includes('long') || section.title?.includes('রচনামূলক') || section.title?.includes('বর্ণনামূলক') || section.title?.includes('কাঠামোবদ্ধ') || section.title?.includes('নিচের প্রশ্ন') || section.title?.includes('প্রশ্নের উত্তর') || section.title?.includes('মূলভাব');
                          const isQaQuestion = section.id?.includes('qa') || section.id?.includes('desc') || section.id === 'en_questions' || section.id?.startsWith('math_word_prob');
                          
                          const isQuestionWithAi = (isShortQuestion || isLongQuestion || isQaQuestion) && !isVocab && !isSentence && !isConjunct && !isPunctuation && !isMcq && !isMatchSec && !isFib && !isTf && !isOral && !isPoem;

                          if (isOral) return null;

                          return (
                            <div key={section.id || sIndex} className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
                              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                <span className="text-sm font-bold text-indigo-900">
                                  {toBengaliNumerals(sIndex + 1)}। {section.title}
                                </span>
                                <span className="text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded border">
                                  {isPoem ? 'মুখস্থ' : `${section.questions?.length || 0}টি উত্তর`}
                                </span>
                              </div>

                              {/* Case 1: Poem - No answer key needed as requested */}
                              {isPoem ? (
                                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-500 italic">
                                  📖 কবিতার উত্তর দেওয়ার প্রয়োজন নেই (শিক্ষার্থীরা পাঠ্যবই থেকে মুখস্থ লিখবে)।
                                </div>
                              ) : (
                                /* Other Section Answers */
                                <div className="space-y-3">
                                  {section.questions?.map((q, qIndex) => {
                                    const itemKey = `${sIndex}_${qIndex}`;
                                    const isCurrentlyRefining = refiningKey === itemKey;
                                    const isCustomPromptOpen = customPromptOpenKey === itemKey;
                                    
                                    // Prefix logic: No ক, খ for vocab, sentence, conjunct, single-prompt
                                    const showSubPrefix = !isVocab && !isSentence && !isConjunct && !isSinglePrompt;
                                    const subPrefix = isMcq 
                                      ? `${toBengaliNumerals(qIndex + 1)}) ` 
                                      : showSubPrefix ? `${bnLetters[qIndex] || `(${qIndex + 1})`} ` : '';

                                    return (
                                      <div key={q.id || qIndex} className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                                        {/* Item Title / Prompt */}
                                        <div className="flex items-start justify-between text-sm">
                                          <div className="flex items-start space-x-1.5">
                                            {subPrefix && <span className="font-bold text-slate-800">{subPrefix}</span>}
                                            <span className="font-medium text-slate-900">
                                              {isVocab ? (
                                                <span className="font-bold text-indigo-950">শব্দ: {q.questionText}</span>
                                              ) : isSentence ? (
                                                <span className="font-bold text-indigo-950">শব্দ: {q.questionText}</span>
                                              ) : isConjunct ? (
                                                <span className="font-bold text-indigo-950">যুক্তবর্ণ: {q.questionText}</span>
                                              ) : (
                                                q.questionText
                                              )}
                                            </span>
                                          </div>
                                        </div>

                                        {/* MCQ Options Display with highlight */}
                                        {isMcq && q.options && q.options.length > 0 && (
                                          <div className="grid grid-cols-2 gap-2 pl-4 py-1 text-xs">
                                            {q.options.map((opt, optIdx) => {
                                              const isSelectedAns = cleanOptionText(opt) === cleanOptionText(q.answer) || (optIdx === 0 && !q.answer);
                                              return (
                                                <div 
                                                  key={optIdx} 
                                                  className={`p-1.5 rounded-lg border flex items-center justify-between cursor-pointer ${
                                                    isSelectedAns ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700'
                                                  }`}
                                                  onClick={() => handleAnswerTextChange(sIndex, qIndex, cleanOptionText(opt))}
                                                >
                                                  <span>{bnOptPrefixes[optIdx]} {opt}</span>
                                                  {isSelectedAns && <span className="text-emerald-600 font-bold">✔ সঠিক</span>}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}

                                        {/* Answer Input & AI Toolbar */}
                                        <div className="space-y-2 pt-1 border-t border-slate-100">
                                          <div className="flex items-start space-x-2">
                                            <span className="text-xs font-bold text-emerald-700 mt-1.5 flex-shrink-0">
                                              {isVocab ? 'অর্থ:' : isSentence ? 'বাক্য:' : isConjunct ? 'বিভাজন ও শব্দ:' : 'উত্তর:'}
                                            </span>
                                            <AutoResizeTextarea
                                              value={q.answer || ''}
                                              onChange={(e) => handleAnswerTextChange(sIndex, qIndex, e.target.value)}
                                              className="w-full text-sm p-2 border border-emerald-300 rounded-lg bg-emerald-50/40 text-emerald-950 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                              placeholder={
                                                isVocab ? 'যেমন: সুবাস' :
                                                isSentence ? 'যেমন: বাঘ একটি বন্য প্রাণী।' :
                                                isConjunct ? 'যেমন: ন + ধ (গন্ধ, বান্ধব)' :
                                                'সঠিক উত্তর লিখুন...'
                                              }
                                            />
                                          </div>

                                          {/* AI Quick Actions Bar for Questions */}
                                          {isQuestionWithAi && (
                                            <div className="flex flex-wrap items-center justify-between gap-2 pl-8 pt-1">
                                              <div className="flex flex-wrap items-center gap-1.5">
                                                <button
                                                  type="button"
                                                  disabled={isCurrentlyRefining}
                                                  onClick={() => handleRefineAnswer(sIndex, qIndex, 'make_longer')}
                                                  className="inline-flex items-center px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition disabled:opacity-50"
                                                  title="উত্তরটিকে আরও বিস্তারিত ও বড় করুন"
                                                >
                                                  🪄 আরেকটু বড় করুন
                                                </button>

                                                <button
                                                  type="button"
                                                  disabled={isCurrentlyRefining}
                                                  onClick={() => handleRefineAnswer(sIndex, qIndex, 'make_shorter')}
                                                  className="inline-flex items-center px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition disabled:opacity-50"
                                                  title="উত্তরটিকে সংক্ষেপে সাজিয়ে দিন"
                                                >
                                                  ⚡ সংক্ষিপ্ত করুন
                                                </button>

                                                <button
                                                  type="button"
                                                  disabled={isCurrentlyRefining}
                                                  onClick={() => handleRefineAnswer(sIndex, qIndex, 'simplify')}
                                                  className="inline-flex items-center px-2.5 py-1 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition disabled:opacity-50"
                                                  title="উত্তরটি সহজ-সরল ভাষায় লিখুন"
                                                >
                                                  🌿 সহজ ভাষায়
                                                </button>

                                                <button
                                                  type="button"
                                                  disabled={isCurrentlyRefining}
                                                  onClick={() => {
                                                    if (isCustomPromptOpen) {
                                                      setCustomPromptOpenKey(null);
                                                    } else {
                                                      setCustomPromptOpenKey(itemKey);
                                                      setCustomPromptText('');
                                                    }
                                                  }}
                                                  className="inline-flex items-center px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition"
                                                  title="নিজের মতো নির্দেশ দিয়ে AI দিয়ে উত্তর সাজান"
                                                >
                                                  💬 কাস্টম নির্দেশ...
                                                </button>
                                              </div>

                                              {isCurrentlyRefining && (
                                                <div className="flex items-center text-xs font-bold text-indigo-600 animate-pulse">
                                                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                                                  AI উত্তর তৈরি করছে...
                                                </div>
                                              )}
                                            </div>
                                          )}

                                          {/* Inline Custom AI Prompt Input */}
                                          {isCustomPromptOpen && isQuestionWithAi && (
                                            <div className="pl-8 pt-2 animate-in fade-in slide-in-from-top-1 duration-150">
                                              <div className="flex items-center gap-2 bg-indigo-50/70 p-2 rounded-xl border border-indigo-200">
                                                <input 
                                                  type="text" 
                                                  value={customPromptText}
                                                  onChange={(e) => setCustomPromptText(e.target.value)}
                                                  placeholder="যেমন: ৩টি পয়েন্টে উদাহরণসহ উত্তর দাও..."
                                                  className="w-full text-xs px-3 py-1.5 bg-white border border-indigo-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                  onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && customPromptText.trim()) {
                                                      handleRefineAnswer(sIndex, qIndex, 'custom', customPromptText);
                                                    }
                                                  }}
                                                />
                                                <button
                                                  type="button"
                                                  disabled={isCurrentlyRefining || !customPromptText.trim()}
                                                  onClick={() => handleRefineAnswer(sIndex, qIndex, 'custom', customPromptText)}
                                                  className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition disabled:opacity-50 flex-shrink-0"
                                                >
                                                  প্রয়োগ করুন
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => setCustomPromptOpenKey(null)}
                                                  className="text-slate-400 hover:text-slate-600 p-1"
                                                >
                                                  <X className="w-4 h-4" />
                                                </button>
                                              </div>
                                            </div>
                                          )}

                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  )}

                </div>
              </div>
            ) : (
              /* Empty Placeholder State */
              <div className="h-full min-h-[600px] w-full bg-white rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-8 text-center shadow-xs">
                <div className="p-5 bg-indigo-50 text-indigo-600 rounded-2xl mb-4 shadow-2xs">
                  <FileText className="w-10 h-10" />
                </div>
                <h3 className="text-base font-bold text-slate-800">
                  A4 Landscape ২-কলাম প্রশ্নপত্র ও উত্তরমালা তৈরি হবে
                </h3>
                <p className="text-sm text-slate-500 max-w-lg mt-2 leading-relaxed">
                  বামপাশে সংরক্ষিত সোর্স (পিডিএফ, ছবি বা নোট) নির্বাচন করুন এবং "প্রশ্নপত্র তৈরি করুন" বাটনে ক্লিক করুন। প্রশ্ন তৈরি হওয়ার পর টগল সুইচে প্রশ্নপত্র ও উত্তরমালার লাইভ এডিটর দেখতে পাবেন।
                </p>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Modal: Full Admin Setup with Tabs (Question Sections, Subjects Management, Classes Management, Saved Books) */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <div className="bg-indigo-600 text-white p-2 rounded-xl">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    বিষয়, শ্রেণি ও মানবন্টন অ্যাডমিন ম্যানেজার
                  </h3>
                  <p className="text-xs text-slate-500">
                    শ্রেণি অনুযায়ী বিষয় ও সংরক্ষিত বই পরিচালনা করুন
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAdminModal(false)} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Admin Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-100/80 px-5 pt-2 gap-1.5 text-xs font-bold overflow-x-auto">
              <button
                type="button"
                onClick={() => setAdminActiveTab('sections')}
                className={`px-3.5 py-2.5 rounded-t-xl border-t border-x transition flex items-center space-x-1.5 whitespace-nowrap ${
                  adminActiveTab === 'sections'
                    ? 'bg-white border-slate-200 text-indigo-700 shadow-2xs font-extrabold'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span>📋 প্রশ্নের ধারা ও মানবন্টন</span>
              </button>

              <button
                type="button"
                onClick={() => setAdminActiveTab('subjects')}
                className={`px-3.5 py-2.5 rounded-t-xl border-t border-x transition flex items-center space-x-1.5 whitespace-nowrap ${
                  adminActiveTab === 'subjects'
                    ? 'bg-white border-slate-200 text-indigo-700 shadow-2xs font-extrabold'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <BookMarked className="w-4 h-4 text-emerald-600" />
                <span>📚 শ্রেণিভিত্তিক বিষয়সমূহ</span>
              </button>

              <button
                type="button"
                onClick={() => setAdminActiveTab('classes')}
                className={`px-3.5 py-2.5 rounded-t-xl border-t border-x transition flex items-center space-x-1.5 whitespace-nowrap ${
                  adminActiveTab === 'classes'
                    ? 'bg-white border-slate-200 text-indigo-700 shadow-2xs font-extrabold'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-amber-600" />
                <span>🎓 শ্রেণি পরিচালনা</span>
              </button>
            </div>

            {/* Success Message Banner */}
            {adminSuccessMsg && (
              <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 text-xs text-emerald-800 font-bold flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600 flex-shrink-0" />
                {adminSuccessMsg}
              </div>
            )}

            {/* ================= TAB 1: SECTIONS SETUP ================= */}
            {adminActiveTab === 'sections' && (
              <>
                {/* Subject & Class Picker for Section Customization */}
                <div className="p-4 border-b border-slate-200 bg-white grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">শ্রেণি নির্বাচন করুন</label>
                    <select
                      value={adminClass}
                      onChange={(e) => setAdminClass(e.target.value)}
                      className="w-full text-sm px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-900 bg-indigo-50/40"
                    >
                      {classesList.map((cls) => (
                        <option key={cls} value={cls}>{cls} শ্রেণি</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">বিষয় নির্বাচন করুন ({adminClass} শ্রেণি)</label>
                    <select
                      value={adminSubject}
                      onChange={(e) => setAdminSubject(e.target.value)}
                      className="w-full text-sm px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-900 bg-indigo-50/40"
                    >
                      {adminClassSubjects.map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sections List */}
                <div className="p-5 overflow-y-auto flex-1 space-y-3 bg-slate-50/60">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-bold text-slate-700">
                      {adminSubject} ({adminClass} শ্রেণি) - মোট ধারা: {toBengaliNumerals(adminSections.length)}টি
                    </span>
                    <button
                      type="button"
                      onClick={handleAdminAddSection}
                      className="inline-flex items-center px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      নতুন ধারা যুক্ত করুন
                    </button>
                  </div>

                  {adminSections.map((sec, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === adminSections.length - 1;

                    return (
                      <div key={sec.id || idx} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-2 flex-1">
                            <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg">
                              {toBengaliNumerals(idx + 1)}
                            </span>
                            <input
                              type="text"
                              value={sec.title}
                              onChange={(e) => handleAdminUpdateField(idx, 'title', e.target.value)}
                              className="w-full text-sm font-bold text-slate-800 px-2.5 py-1 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                              placeholder="প্রশ্নের শিরোনাম..."
                            />
                          </div>

                          {/* Reorder and Delete */}
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              disabled={isFirst}
                              onClick={() => handleAdminMoveSection(idx, -1)}
                              className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition disabled:opacity-25"
                              title="উপরে তুলুন"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={isLast}
                              onClick={() => handleAdminMoveSection(idx, 1)}
                              className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition disabled:opacity-25"
                              title="নিচে নামান"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAdminDeleteSection(idx)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="ডিলিট করুন"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Numeric and Flag Configuration */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                          <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                            <span className="text-slate-600 font-semibold">প্রশ্নের সংখ্যা:</span>
                            <input
                              type="number"
                              min="1"
                              max="30"
                              value={sec.count}
                              onChange={(e) => handleAdminUpdateField(idx, 'count', parseInt(e.target.value) || 1)}
                              className="w-14 text-center font-bold px-1 py-0.5 border rounded bg-white"
                            />
                          </div>

                          <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                            <span className="text-slate-600 font-semibold">প্রতিটির মান:</span>
                            <input
                              type="number"
                              min="1"
                              max="30"
                              value={sec.marksPerQuestion}
                              onChange={(e) => handleAdminUpdateField(idx, 'marksPerQuestion', parseInt(e.target.value) || 1)}
                              className="w-14 text-center font-bold px-1 py-0.5 border rounded bg-white"
                            />
                          </div>

                          <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                            <label className="flex items-center space-x-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={sec.isMcq || false}
                                onChange={(e) => handleAdminUpdateField(idx, 'isMcq', e.target.checked)}
                                className="h-4 w-4 text-indigo-600 rounded"
                              />
                              <span className="text-slate-700 font-semibold">MCQ টাইপ</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Modal Footer for Sections */}
                <div className="p-4 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleAdminReset}
                    className="inline-flex items-center px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                    ডিফল্ট মানবন্টনে রিসেট
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowAdminModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                    >
                      বন্ধ করুন
                    </button>
                    <button
                      type="button"
                      onClick={handleAdminSave}
                      className="inline-flex items-center px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
                    >
                      <Save className="w-4 h-4 mr-1.5" />
                      এই বিষয়ের জন্য সংরক্ষণ করুন
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ================= TAB 2: CLASS-SPECIFIC SUBJECTS MANAGEMENT ================= */}
            {adminActiveTab === 'subjects' && (
              <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/60">
                {/* Select Class for Subject Management */}
                <div className="bg-indigo-50/80 p-3.5 rounded-xl border border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="text-xs font-bold text-indigo-900">
                    কোন শ্রেণির বিষয় পরিচালনা করবেন?
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {classesList.map((cls) => (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => {
                          setAdminClass(cls);
                        }}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                          adminClass === cls
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-indigo-100'
                        }`}
                      >
                        {cls} শ্রেণি
                      </button>
                    ))}
                  </div>
                </div>

                {/* Add New Subject Form for the selected class */}
                <form onSubmit={handleAddNewSubjectForClass} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <label className="block text-xs font-bold text-slate-800">
                    ➕ <span className="text-indigo-700">{adminClass} শ্রেণি</span>-তে নতুন বিষয় যোগ করুন:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={newSubjectInput}
                      onChange={(e) => setNewSubjectInput(e.target.value)}
                      placeholder="যেমন: চারু ও কারুকলা / শারীরিক শিক্ষা..."
                      className="flex-1 text-sm px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition flex-shrink-0"
                    >
                      যোগ করুন
                    </button>
                  </div>
                </form>

                {/* List of Existing Subjects for this specific class */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-slate-700">
                      {adminClass} শ্রেণির বিষয়সমূহ ({toBengaliNumerals(adminClassSubjects.length)}টি):
                    </span>
                    <button
                      type="button"
                      onClick={handleResetSubjectsForClass}
                      className="text-xs font-semibold text-slate-500 hover:text-indigo-600 transition flex items-center"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      এই শ্রেণির বিষয় ডিফল্টে রিসেট
                    </button>
                  </div>

                  <div className="space-y-2">
                    {adminClassSubjects.map((sub, idx) => {
                      const isEditing = editingSubjectIdx === idx;

                      return (
                        <div key={sub} className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
                          {isEditing ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                value={editingSubjectName}
                                onChange={(e) => setEditingSubjectName(e.target.value)}
                                className="flex-1 text-sm font-bold px-2.5 py-1 border border-indigo-400 rounded-lg focus:outline-none"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEditSubjectForClass(idx);
                                  if (e.key === 'Escape') setEditingSubjectIdx(null);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEditSubjectForClass(idx)}
                                className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                              >
                                সেভ
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingSubjectIdx(null)}
                                className="px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                              >
                                বাতিল
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center space-x-2.5">
                                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                                  {toBengaliNumerals(idx + 1)}
                                </span>
                                <span className="text-sm font-bold text-slate-800">
                                  {sub}
                                </span>
                                {selectedClass === adminClass && selectedSubject === sub && (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    বর্তমান বিষয়
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSubjectIdx(idx);
                                    setEditingSubjectName(sub);
                                  }}
                                  className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                  title="বিষয়ের নাম পরিবর্তন করুন"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSubjectForClass(idx, sub)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                  title={`শুধুমাত্র ${adminClass} শ্রেণি থেকে এই বিষয়টি ডিলিট করুন`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ================= TAB 3: CLASSES MANAGEMENT (ADD / EDIT / DELETE) ================= */}
            {adminActiveTab === 'classes' && (
              <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/60">
                {/* Add New Class Form */}
                <form onSubmit={handleAddNewClass} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <label className="block text-xs font-bold text-slate-800">
                    ➕ নতুন শ্রেণি যোগ করুন
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={newClassInput}
                      onChange={(e) => setNewClassInput(e.target.value)}
                      placeholder="যেমন: নার্সারি / কেজি / ষষ্ঠ..."
                      className="flex-1 text-sm px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition flex-shrink-0"
                    >
                      যোগ করুন
                    </button>
                  </div>
                </form>

                {/* List of Existing Classes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-slate-700">
                      সকল শ্রেণি ({toBengaliNumerals(classesList.length)}টি):
                    </span>
                  </div>

                  <div className="space-y-2">
                    {classesList.map((cls, idx) => {
                      const isEditing = editingClassIdx === idx;

                      return (
                        <div key={cls} className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
                          {isEditing ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                value={editingClassName}
                                onChange={(e) => setEditingClassName(e.target.value)}
                                className="flex-1 text-sm font-bold px-2.5 py-1 border border-indigo-400 rounded-lg focus:outline-none"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEditClass(idx);
                                  if (e.key === 'Escape') setEditingClassIdx(null);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEditClass(idx)}
                                className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                              >
                                সেভ
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingClassIdx(null)}
                                className="px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                              >
                                বাতিল
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center space-x-2.5">
                                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                                  {toBengaliNumerals(idx + 1)}
                                </span>
                                <span className="text-sm font-bold text-slate-800">
                                  {cls} শ্রেণি
                                </span>
                                {selectedClass === cls && (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    বর্তমান শ্রেণি
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingClassIdx(idx);
                                    setEditingClassName(cls);
                                  }}
                                  className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                  title="শ্রেণির নাম পরিবর্তন করুন"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteClass(idx, cls)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                  title="শ্রেণিটি ডিলিট করুন"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Modal: Quick Add New Custom Section */}
      {showAddSectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">নতুন ধারা / বিভাগ যোগ করুন</h3>
              <button onClick={() => setShowAddSectionModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewSection} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">প্রশ্নের শিরোনাম</label>
                <input 
                  type="text" 
                  required
                  placeholder="যেমন: মৌখিক ও শ্রেণিমূল্যায়ন"
                  value={newSecTitle}
                  onChange={(e) => setNewSecTitle(e.target.value)}
                  className="w-full text-base px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">কতটি প্রশ্ন</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="30"
                    value={newSecCount}
                    onChange={(e) => setNewSecCount(e.target.value)}
                    className="w-full text-base px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">প্রতিটির মান (নম্বর)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="50"
                    value={newSecMarks}
                    onChange={(e) => setNewSecMarks(e.target.value)}
                    className="w-full text-base px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  নির্দিষ্ট সোর্স নির্বাচন (ঐচ্ছিক)
                </label>
                <select
                  value={newSecSourceId}
                  onChange={(e) => setNewSecSourceId(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 font-medium"
                >
                  <option value="">📁 মেইন সোর্সসমূহ (ডিফল্ট)</option>
                  {availableSources.map((src) => (
                    <option key={src.id} value={src.id}>
                      {src.type === 'pdf' ? '📕' : src.type === 'image' ? '🖼️' : '📝'} {src.title}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  নির্দিষ্ট কোনো সোর্স নির্বাচন করলে এই ধারাটি শুধু সেই সোর্স থেকেই তৈরি হবে।
                </p>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input 
                  type="checkbox" 
                  id="mcqCheck"
                  checked={newSecIsMcq}
                  onChange={(e) => setNewSecIsMcq(e.target.checked)}
                  className="h-5 w-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <label htmlFor="mcqCheck" className="text-sm font-semibold text-slate-700">
                  এটি কি নৈর্ব্যক্তিক (MCQ) প্রশ্ন?
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddSectionModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
                >
                  যোগ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Gemini API Key Settings */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Google Gemini API Key সেটিংস</h3>
                  <p className="text-xs text-slate-500">প্রশ্নপত্র তৈরির জন্য আপনার নিজস্ব ফ্রি API Key দিন</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowApiKeyModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveApiKey} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Gemini API Key
                </label>
                <input
                  type="text"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full text-sm font-mono px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 focus:bg-white"
                />
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  গুগল এআই স্টুডিওর ফ্রি API Key সাধারণত <code className="bg-slate-100 px-1.5 py-0.5 rounded font-bold text-indigo-700">AIzaSy...</code> দিয়ে শুরু হয়।
                </p>
              </div>

              <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 space-y-1.5">
                <p className="font-bold flex items-center">
                  <Sparkles className="w-4 h-4 mr-1 text-indigo-600" />
                  কীভাবে সম্পূর্ণ ফ্রিতে API Key পাবেন?
                </p>
                <p>
                  ১. <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="underline font-bold text-indigo-700 inline-flex items-center">Google AI Studio এ যান <ExternalLink className="w-3 h-3 ml-0.5" /></a>
                </p>
                <p>২. আপনার জিমেইল দিয়ে লগইন করে <strong>"Create API key"</strong> বাটনে ক্লিক করুন।</p>
                <p>৩. তৈরি হওয়া Key-টি কপি করে এখানে পেস্ট করে সেভ করুন।</p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                {userApiKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setApiKeyInput('');
                      localStorage.removeItem('gemini_api_key');
                      setUserApiKey('');
                      setShowApiKeyModal(false);
                      alert('API Key মুছে ফেলা হয়েছে।');
                    }}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800"
                  >
                    API Key মুছুন
                  </button>
                )}
                <div className="flex items-center space-x-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setShowApiKeyModal(false)}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
                  >
                    সংরক্ষণ করুন
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
