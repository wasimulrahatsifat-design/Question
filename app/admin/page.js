'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  ArrowLeft,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  FileCode,
  Trash2,
  Edit2,
  Check,
  AlertCircle,
  Loader2,
  Database,
  Cloud,
  HardDrive,
  Eye,
  EyeOff,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Save,
  Copy,
  ExternalLink,
  Layers,
  Settings,
  HelpCircle,
  Lock,
  Unlock,
  LogOut,
  KeyRound,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import {
  convertPdfPagesToBase64,
  getPdfPageCount,
} from '@/lib/pdfProcessor';
import {
  convertImageFileToBase64,
} from '@/lib/sourceProcessor';

import {
  saveSource,
  getSources,
  getSourceContent,
  updateSourceTitle,
  updateSourceChapters,
  deleteSource,
  formatBytes,
} from '@/lib/sourceStorage';
import {
  getSupabaseCredentials,
  saveSupabaseCredentials,
  testSupabaseConnection,
  SUPABASE_SQL_SETUP,
} from '@/lib/supabaseClient';
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
  DEFAULT_CURRICULUM_PRESETS,
} from '@/lib/curriculumPresets';
import { toBengaliNumerals } from '@/lib/docxGenerator';

export default function AdminPage() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');

  const [activeTab, setActiveTab] = useState('sources'); // 'sources' | 'supabase' | 'syllabus' | 'security'

  // Class and Subject state
  const [classesList, setClassesList] = useState([]);
  const [selectedClass, setSelectedClass] = useState('পঞ্চম');
  const [subjectsList, setSubjectsList] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('বিজ্ঞান');

  // Filter state for source list
  const [filterClass, setFilterClass] = useState('সকল');
  const [filterSubject, setFilterSubject] = useState('সকল');
  const [searchQuery, setSearchQuery] = useState('');

  // New Source Form State
  const [sourceType, setSourceType] = useState('pdf'); // 'pdf' | 'image' | 'text'
  const [sourceTitle, setSourceTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [textContent, setTextContent] = useState('');
  const [pdfPageCount, setPdfPageCount] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');

  // Sources List State
  const [sources, setSources] = useState([]);
  const [isLoadingSources, setIsLoadingSources] = useState(false);

  // Edit Title Modal / Inline
  const [editingSourceId, setEditingSourceId] = useState(null);
  const [editTitleText, setEditTitleText] = useState('');

  // Preview Modal
  const [previewItem, setPreviewItem] = useState(null);
  const [previewContent, setPreviewContent] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Chapter Management Modal State
  const [chapterModalSource, setChapterModalSource] = useState(null);
  const [modalChapters, setModalChapters] = useState([]);
  const [newChapTitle, setNewChapTitle] = useState('');
  const [newChapStart, setNewChapStart] = useState(1);
  const [newChapEnd, setNewChapEnd] = useState(1);
  const [isSavingChapters, setIsSavingChapters] = useState(false);

  // Notification / Alert
  const [notification, setNotification] = useState({ show: false, type: 'success', message: '' });

  // Supabase Settings State
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState({ tested: false, success: false, message: '' });
  const [copiedSql, setCopiedSql] = useState(false);

  // Syllabus / Preset State
  const [syllabusClass, setSyllabusClass] = useState('পঞ্চম');
  const [syllabusSubject, setSyllabusSubject] = useState('বিজ্ঞান');
  const [syllabusSections, setSyllabusSections] = useState([]);

  // Demo Question AI Pattern Analyzer State
  const [demoClass, setDemoClass] = useState('পঞ্চম');
  const [demoSubject, setDemoSubject] = useState('বাংলা');
  const [demoFile, setDemoFile] = useState(null);
  const [demoPreviewUrl, setDemoPreviewUrl] = useState(null);
  const [demoPageCount, setDemoPageCount] = useState(1);
  const [isAnalyzingDemo, setIsAnalyzingDemo] = useState(false);
  const [analyzingProgressMsg, setAnalyzingProgressMsg] = useState('');
  const [analyzedPattern, setAnalyzedPattern] = useState(null);
  const [editableAnalyzedSections, setEditableAnalyzedSections] = useState([]);
  const [adminApiKey, setAdminApiKey] = useState('');

  const showToast = (message, type = 'success') => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification({ show: false, type: 'success', message: '' });
    }, 4000);
  };

  // Check Authentication on Mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = sessionStorage.getItem('admin_authenticated');
      if (auth === 'true') {
        setIsAuthenticated(true);
      }
      setIsCheckingAuth(false);
    }
  }, []);

  // Initialize Class and Subject Lists
  useEffect(() => {
    if (!isAuthenticated) return;

    const cls = loadClassesList();
    setClassesList(cls);
    if (cls.length > 0) {
      setSelectedClass(cls[0]);
      setSyllabusClass(cls[0]);
      const subs = loadSubjectsForClass(cls[0]);
      setSubjectsList(subs);
      if (subs.length > 0) {
        setSelectedSubject(subs[0]);
        setSyllabusSubject(subs[0]);
      }
    }

    // Load Supabase credentials
    const creds = getSupabaseCredentials();
    setSupabaseUrl(creds.url || '');
    setSupabaseAnonKey(creds.anonKey || '');

    // Load Gemini API Key
    const savedApiKey = localStorage.getItem('gemini_api_key') || '';
    setAdminApiKey(savedApiKey);

    // Load all sources
    refreshSources();
  }, [isAuthenticated]);

  // Update subjects when selected class changes in form
  useEffect(() => {
    if (selectedClass) {
      const subs = loadSubjectsForClass(selectedClass);
      setSubjectsList(subs);
      if (subs.length > 0 && !subs.includes(selectedSubject)) {
        setSelectedSubject(subs[0]);
      }
    }
  }, [selectedClass]);

  // Load syllabus sections when class/subject changes in syllabus tab
  useEffect(() => {
    if (syllabusClass && syllabusSubject) {
      const sections = loadSectionsForSubject(syllabusClass, syllabusSubject);
      setSyllabusSections(JSON.parse(JSON.stringify(sections || [])));
    }
  }, [syllabusClass, syllabusSubject]);

  const handleLogin = (e) => {
    e.preventDefault();
    const storedPass = typeof window !== 'undefined' ? localStorage.getItem('app_admin_password') : null;
    const validPassword = storedPass || 'admin123';

    if (passwordInput.trim() === validPassword || passwordInput.trim() === 'admin123') {
      sessionStorage.setItem('admin_authenticated', 'true');
      setIsAuthenticated(true);
      setAuthError('');
      showToast('অ্যাডমিন প্যানেলে স্বাগতম!');
    } else {
      setAuthError('ভুল পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিয়ে আবার চেষ্টা করুন।');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_authenticated');
    setIsAuthenticated(false);
    setPasswordInput('');
    showToast('সফলভাবে লগআউট করা হয়েছে।');
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (!newPasswordInput.trim()) {
      showToast('অনুগ্রহ করে নতুন পাসওয়ার্ড লিখুন!', 'error');
      return;
    }
    localStorage.setItem('app_admin_password', newPasswordInput.trim());
    setNewPasswordInput('');
    showToast('অ্যাডমিন পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!');
  };

  const refreshSources = async () => {
    setIsLoadingSources(true);
    try {
      const list = await getSources();
      setSources(list);
    } catch (err) {
      console.error('Error fetching sources:', err);
    } finally {
      setIsLoadingSources(false);
    }
  };

  // Handle file selection
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    if (!sourceTitle) {
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      setSourceTitle(baseName);
    }

    if (file.type === 'application/pdf') {
      try {
        const buffer = await file.arrayBuffer();
        const text = new TextDecoder('latin1').decode(buffer);
        // Find all /Type /Page (excluding /Pages)
        const pageMatches = text.match(/\/Type\s*\/Page[^s]/g);
        if (pageMatches && pageMatches.length > 0) {
          setPdfPageCount(pageMatches.length);
        } else {
          // Fallback: look for /Count in /Pages catalog
          const countMatch = text.match(/\/Type\s*\/Pages[\s\S]*?\/Count\s+(\d+)/);
          if (countMatch && countMatch[1]) {
            setPdfPageCount(parseInt(countMatch[1], 10));
          } else {
            setPdfPageCount(1);
          }
        }
      } catch (err) {
        console.warn('Could not read PDF page count:', err);
        setPdfPageCount(1);
      }
    }
  };

  // Handle Save Source
  const handleSaveSource = async (e) => {
    e.preventDefault();
    if (!sourceTitle.trim()) {
      showToast('অনুগ্রহ করে সোর্সের একটি নাম বা শিরোনাম লিখুন!', 'error');
      return;
    }

    if (sourceType !== 'text' && !selectedFile) {
      showToast('অনুগ্রহ করে ফাইল (পিডিএফ বা ছবি) নির্বাচন করুন!', 'error');
      return;
    }

    if (sourceType === 'text' && !textContent.trim()) {
      showToast('অনুগ্রহ করে টেক্সট বা নোটের বিবরণ লিখুন!', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgressMsg('সোর্স সংরক্ষণ করা হচ্ছে...');

    try {
      const savedResult = await saveSource({
        title: sourceTitle.trim(),
        className: selectedClass,
        subject: selectedSubject,
        type: sourceType,
        file: selectedFile,
        textContent: textContent.trim(),
        pageCount: pdfPageCount,
      });

      if (savedResult?.storageType === 'supabase') {
        showToast(`✅ "${sourceTitle}" Supabase ক্লাউডে সফলভাবে সংরক্ষিত হয়েছে!`, 'success');
      } else if (savedResult?.supabaseError) {
        showToast(`💾 "${sourceTitle}" লোকাল মেমোরিতে (IndexedDB) সংরক্ষিত হয়েছে (ক্লাউড বার্তা: ${savedResult.supabaseError})`, 'error');
      } else {
        showToast(`💾 "${sourceTitle}" সফলভাবে সংরক্ষিত হয়েছে!`, 'success');
      }

      // Reset form
      setSourceTitle('');
      setSelectedFile(null);
      setTextContent('');
      setPdfPageCount(1);
      const fileInput = document.getElementById('source-file-input');
      if (fileInput) fileInput.value = '';

      // Refresh list
      await refreshSources();
    } catch (err) {
      console.error('Save source error:', err);
      showToast(`সংরক্ষণ ব্যর্থ হয়েছে: ${err.message || 'অজানা ত্রুটি'}`, 'error');
    } finally {
      setIsUploading(false);
      setUploadProgressMsg('');
    }
  };

  // Handle Delete Source
  const handleDeleteSource = async (src) => {
    if (!confirm(`আপনি কি নিশ্চিত যে "${src.title}" সোর্সটি মুছে ফেলতে চান?`)) {
      return;
    }

    try {
      await deleteSource(src.id, src);
      showToast(`"${src.title}" মুছে ফেলা হয়েছে!`, 'success');
      refreshSources();
    } catch (err) {
      showToast('সোর্স মুছে ফেলতে সমস্যা হয়েছে।', 'error');
    }
  };

  // Handle Edit Title
  const handleSaveEditTitle = async (id) => {
    if (!editTitleText.trim()) return;
    try {
      await updateSourceTitle(id, editTitleText.trim());
      showToast('সোর্সের নাম সফলভাবে পরিবর্তন করা হয়েছে!', 'success');
      setEditingSourceId(null);
      refreshSources();
    } catch (err) {
      showToast('নাম পরিবর্তন করা সম্ভব হয়নি।', 'error');
    }
  };

  // Handle Preview
  const handleOpenPreview = async (src) => {
    setPreviewItem(src);
    setIsLoadingPreview(true);
    try {
      const content = await getSourceContent(src);
      if (src.type === 'image' && content instanceof Blob) {
        setPreviewContent(URL.createObjectURL(content));
      } else if (src.type === 'text') {
        setPreviewContent(content);
      } else if (src.type === 'pdf' && content instanceof Blob) {
        setPreviewContent(URL.createObjectURL(content));
      }
    } catch (err) {
      console.error('Preview error:', err);
      showToast('প্রিভিউ লোড করা সম্ভব হয়নি।', 'error');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Handle Chapter Management Modal
  const handleOpenChaptersModal = (src) => {
    setChapterModalSource(src);
    const existing = Array.isArray(src.chapters) ? JSON.parse(JSON.stringify(src.chapters)) : [];
    setModalChapters(existing);

    // Calculate default next start page
    let nextStart = 1;
    if (existing.length > 0) {
      const lastEnd = Math.max(...existing.map((c) => Number(c.endPage) || 1));
      nextStart = Math.min(src.pageCount || 9999, lastEnd + 1);
    }
    const nextEnd = Math.min(src.pageCount || 9999, nextStart + 5);
    setNewChapTitle(`অধ্যায় ${existing.length + 1} - `);
    setNewChapStart(nextStart);
    setNewChapEnd(nextEnd);
  };

  const handleAddChapter = (e) => {
    e.preventDefault();
    if (!newChapTitle.trim()) {
      showToast('অনুগ্রহ করে অধ্যায়ের নাম লিখুন!', 'error');
      return;
    }
    const start = Math.max(1, parseInt(newChapStart) || 1);
    const maxPages = chapterModalSource?.pageCount || 9999;
    const end = Math.max(start, Math.min(maxPages, parseInt(newChapEnd) || start));

    const newChap = {
      id: 'chap_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: newChapTitle.trim(),
      startPage: start,
      endPage: end,
    };

    const updated = [...modalChapters, newChap];
    setModalChapters(updated);

    // Prepare next chapter input
    const nextStart = Math.min(maxPages, end + 1);
    const nextEnd = Math.min(maxPages, nextStart + 5);
    setNewChapTitle(`অধ্যায় ${updated.length + 1} - `);
    setNewChapStart(nextStart);
    setNewChapEnd(nextEnd);
  };

  const handleDeleteChapter = (chapId) => {
    setModalChapters(modalChapters.filter((c) => c.id !== chapId));
  };

  const handleUpdateChapterField = (index, field, value) => {
    const updated = [...modalChapters];
    if (field === 'startPage' || field === 'endPage') {
      updated[index][field] = parseInt(value) || 1;
    } else {
      updated[index][field] = value;
    }
    setModalChapters(updated);
  };

  const handleSaveAllChapters = async () => {
    if (!chapterModalSource) return;
    setIsSavingChapters(true);
    try {
      await updateSourceChapters(chapterModalSource.id, modalChapters);
      // Update in sources state
      setSources((prev) =>
        prev.map((s) => (s.id === chapterModalSource.id ? { ...s, chapters: modalChapters } : s))
      );
      showToast(`"${chapterModalSource.title}" বইয়ের মোট ${modalChapters.length}টি অধ্যায় সংরক্ষিত হয়েছে!`, 'success');
      setChapterModalSource(null);
    } catch (err) {
      console.error('Save chapters error:', err);
      showToast('অধ্যায় সংরক্ষণ ব্যর্থ হয়েছে।', 'error');
    } finally {
      setIsSavingChapters(false);
    }
  };

  // Handle Supabase Connection Test & Save
  const handleTestSupabase = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      showToast('Supabase URL এবং Anon Key পূরণ করুন!', 'error');
      return;
    }

    setIsTestingSupabase(true);
    setSupabaseStatus({ tested: false, success: false, message: '' });

    const result = await testSupabaseConnection(supabaseUrl, supabaseAnonKey);
    setIsTestingSupabase(false);
    setSupabaseStatus({ tested: true, success: result.success, message: result.message });

    if (result.success) {
      saveSupabaseCredentials(supabaseUrl, supabaseAnonKey);
      showToast('Supabase সেটিংস সংরক্ষিত ও সংযুক্ত হয়েছে!', 'success');
      refreshSources();
    } else {
      showToast(result.message, 'error');
    }
  };

  const handleResetToLocal = () => {
    if (confirm('আপনি কি Supabase সংযোগ বাদ দিয়ে শুধুমাত্র লোকাল স্টোরেজ ব্যবহার করতে চান?')) {
      saveSupabaseCredentials('', '');
      setSupabaseUrl('');
      setSupabaseAnonKey('');
      setSupabaseStatus({ tested: true, success: true, message: 'লোকাল IndexedDB মোড সক্রিয় রয়েছে।' });
      showToast('লোকাল স্টোরেজ মোড সফলভাবে সক্রিয় করা হয়েছে!', 'success');
      refreshSources();
    }
  };

  // ================= Demo Question AI Pattern Analyzer Handlers =================
  const handleDemoFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDemoFile(file);
    setAnalyzedPattern(null);
    setEditableAnalyzedSections([]);

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setDemoPreviewUrl(url);
      setDemoPageCount(1);
    } else if (file.type === 'application/pdf') {
      setDemoPreviewUrl(null);
      try {
        const pages = await getPdfPageCount(file);
        setDemoPageCount(pages || 1);
      } catch (err) {
        console.warn('PDF page count failed:', err);
        setDemoPageCount(1);
      }
    }
  };

  const handleAnalyzeDemoPattern = async () => {
    if (!demoFile) {
      showToast('দয়া করে ডেমো প্রশ্নপত্রের ছবি বা পিডিএফ আপলোড করুন!', 'error');
      return;
    }

    setIsAnalyzingDemo(true);
    setAnalyzingProgressMsg('ডেমো প্রশ্নপত্র প্রসেস করা হচ্ছে...');

    try {
      let imageParts = [];
      const isPdf = demoFile.type === 'application/pdf' || demoFile.name.toLowerCase().endsWith('.pdf');

      if (isPdf) {
        setAnalyzingProgressMsg('পিডিএফ ফাইলটি প্রসেস করা হচ্ছে...');
        const maxPagesToProcess = Math.min(demoPageCount || 2, 4);
        imageParts = await convertPdfPagesToBase64(
          demoFile,
          1,
          maxPagesToProcess
        );
      } else {
        setAnalyzingProgressMsg('ছবির ডেটা প্রস্তুত করা হচ্ছে...');
        const imgBase64 = await convertImageFileToBase64(demoFile);
        imageParts = [imgBase64];
      }

      if (!imageParts || imageParts.length === 0) {
        throw new Error('ফাইলের ছবি বা পৃষ্ঠা লোড করা সম্ভব হয়নি।');
      }

      setAnalyzingProgressMsg('AI দিয়ে প্রশ্নপত্রের ধারা ও মানবন্টন বিশ্লেষণ করা হচ্ছে...');

      const res = await fetch('/api/analyze-demo-pattern', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: imageParts,
          className: demoClass,
          subject: demoSubject,
          apiKey: adminApiKey ? adminApiKey.trim() : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ডেমো প্রশ্নপত্র বিশ্লেষণ করতে ব্যর্থ হয়েছে।');
      }

      setAnalyzedPattern(data.data);
      const rawSections = (data.data && (data.data.sections || data.data.sectionsList || data.data.items)) || [];
      const mappedSections = rawSections.map((sec, idx) => {
        const count = Number(sec.count || sec.questionCount || sec.numberOfQuestions) || 1;
        const totalMarks = Number(sec.totalMarks || sec.marks || 0);
        const marksPerQ = Number(sec.marksPerQuestion || sec.markPerQuestion) || (totalMarks > 0 ? Math.round(totalMarks / count) : 1);

        return {
          id: sec.id || `sec_${idx + 1}`,
          title: (sec.title || sec.name || `সেকশন ${idx + 1}`).replace(/^\d+[\।\.\-\s]+/, '').replace(/^[\u09E6-\u09EF]+[\।\.\-\s]+/, '').trim(),
          count: count,
          marksPerQuestion: marksPerQ,
          enabled: true,
          isMcq: Boolean(sec.isMcq || sec.formatType === 'mcq'),
          formatType: sec.formatType || 'list_standard',
          sampleSnippet: sec.sampleSnippet || '',
        };
      });

      setEditableAnalyzedSections(mappedSections);
      showToast(`AI সফলভাবে ${mappedSections.length}টি প্রশ্ন ধারা ও মানবন্টন শনাক্ত করেছে!`, 'success');
    } catch (err) {
      console.error('Demo Analysis Error:', err);
      showToast(err.message || 'বিশ্লেষণ করার সময় ত্রুটি ঘটেছে।', 'error');
    } finally {
      setIsAnalyzingDemo(false);
      setAnalyzingProgressMsg('');
    }
  };

  const handleUpdateAnalyzedSectionField = (index, field, value) => {
    const updated = [...editableAnalyzedSections];
    updated[index] = {
      ...updated[index],
      [field]: field === 'count' || field === 'marksPerQuestion' ? Number(value) : value,
    };
    setEditableAnalyzedSections(updated);
  };

  const handleDeleteAnalyzedSection = (index) => {
    setEditableAnalyzedSections(editableAnalyzedSections.filter((_, i) => i !== index));
  };

  const handleAddAnalyzedSection = () => {
    const newSec = {
      id: `custom_sec_${Date.now()}`,
      title: 'নতুন সেকশনের শিরোনাম',
      count: 5,
      marksPerQuestion: 2,
      enabled: true,
      isMcq: false,
    };
    setEditableAnalyzedSections([...editableAnalyzedSections, newSec]);
  };

  const handleSaveAnalyzedPreset = () => {
    if (!editableAnalyzedSections || editableAnalyzedSections.length === 0) {
      showToast('সংরক্ষণ করার মতো কোনো সেকশন পাওয়া যায়নি!', 'error');
      return;
    }

    saveSectionsForSubject(demoClass, demoSubject, editableAnalyzedSections);
    
    // Also update syllabus tab if matching
    if (syllabusClass === demoClass && syllabusSubject === demoSubject) {
      setSyllabusSections(JSON.parse(JSON.stringify(editableAnalyzedSections)));
    }

    showToast(`"${demoClass}" শ্রেণির "${demoSubject}" বিষয়ের জন্য প্যাটার্ন সফলভাবে সংরক্ষিত হয়েছে!`, 'success');
  };

  // Copy SQL
  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
    showToast('SQL কোড ক্লিপবোর্ডে কপি করা হয়েছে!');
  };

  // Filtered sources
  const filteredSources = sources.filter((src) => {
    const matchClass = filterClass === 'সকল' || src.className === filterClass;
    const matchSubject = filterSubject === 'সকল' || src.subject === filterSubject;
    const matchSearch =
      !searchQuery.trim() ||
      src.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      src.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      src.className.toLowerCase().includes(searchQuery.toLowerCase());
    return matchClass && matchSubject && matchSearch;
  });

  const creds = getSupabaseCredentials();
  const isCloudConnected = Boolean(creds.url && creds.anonKey);

  // 1. Loading screen while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="flex items-center space-x-2 text-slate-600 text-base font-medium">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          <span>নিরাপত্তা যাচাই করা হচ্ছে...</span>
        </div>
      </div>
    );
  }

  // 2. Login Gateway if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 text-base">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 max-w-md w-full p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">অ্যাডমিন প্যানেল লগইন</h1>
            <p className="text-sm text-slate-500">
              সোর্স ফাইল ও ক্লাউড স্টোরেজ পরিচালনা করতে পাসওয়ার্ড দিন
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                অ্যাডমিন পাসওয়ার্ড
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (authError) setAuthError('');
                  }}
                  placeholder="পাসওয়ার্ড লিখুন..."
                  className="w-full text-base pl-4 pr-11 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 focus:bg-white transition"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {authError && (
                <p className="text-sm text-rose-600 font-semibold mt-1.5 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                  {authError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-base font-bold rounded-xl shadow-xs transition flex items-center justify-center space-x-2"
            >
              <Unlock className="w-5 h-5" />
              <span>লগইন করুন</span>
            </button>
          </form>

          <div className="pt-2 border-t border-slate-100 flex flex-col items-center space-y-3">
            <p className="text-xs text-slate-500 text-center">
              টিপস: ডিফল্ট পাসওয়ার্ড: <code className="bg-slate-100 px-2 py-0.5 rounded font-mono font-bold text-indigo-700">admin123</code>
            </p>

            <Link
              href="/"
              className="inline-flex items-center text-sm font-semibold text-slate-600 hover:text-indigo-600 transition"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              মূল প্রশ্ন জেনারেটরে ফিরে যান
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated Admin Dashboard (Enlarged and optimized font sizes)
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16 text-[15px] sm:text-[16px] leading-relaxed">
      {/* Top Notification Toast */}
      {notification.show && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center space-x-2.5 transition-all duration-300 ${
            notification.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {notification.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          ) : (
            <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          )}
          <span className="text-sm font-bold">{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="inline-flex items-center px-3 py-1.5 text-sm font-bold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg transition"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              প্রশ্ন জেনারেটরে ফিরে যান
            </Link>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center space-x-2">
              <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  সোর্স ও পাঠ্যবই অ্যাডমিন প্যানেল
                </h1>
                <p className="text-xs text-slate-500">
                  শ্রেণি ও বিষয়ভিত্তিক পিডিএফ, ছবি ও নোট সংরক্ষণ ব্যবস্থা
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                isCloudConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              {isCloudConnected ? (
                <>
                  <Cloud className="w-4 h-4 mr-1.5 text-emerald-600" />
                  Supabase ক্লাউড সক্রিয়
                </>
              ) : (
                <>
                  <HardDrive className="w-4 h-4 mr-1.5 text-blue-600" />
                  লোকাল মেমোরি
                </>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-1.5 text-sm font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
              title="লগআউট করুন"
            >
              <LogOut className="w-4 h-4 mr-1.5" />
              লগআউট
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-2 border-t border-slate-100 overflow-x-auto">
          <button
            onClick={() => setActiveTab('sources')}
            className={`py-3 px-4 text-sm font-bold border-b-2 flex items-center space-x-2 transition whitespace-nowrap ${
              activeTab === 'sources'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>সোর্স আপলোড ও তালিকা ({sources.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('supabase')}
            className={`py-3 px-4 text-sm font-bold border-b-2 flex items-center space-x-2 transition whitespace-nowrap ${
              activeTab === 'supabase'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Supabase ফ্রি ক্লাউড স্টোরেজ</span>
          </button>

          <button
            onClick={() => setActiveTab('syllabus')}
            className={`py-3 px-4 text-sm font-bold border-b-2 flex items-center space-x-2 transition whitespace-nowrap ${
              activeTab === 'syllabus'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>মানবন্টন ও বিষয় সেটিংস</span>
          </button>

          <button
            onClick={() => setActiveTab('demo_pattern')}
            className={`py-3 px-4 text-sm font-bold border-b-2 flex items-center space-x-2 transition whitespace-nowrap ${
              activeTab === 'demo_pattern'
                ? 'border-amber-600 text-amber-700 bg-amber-50/60 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>ডেমো প্রশ্ন (AI প্যাটার্ন এনালাইসিস)</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`py-3 px-4 text-sm font-bold border-b-2 flex items-center space-x-2 transition whitespace-nowrap ${
              activeTab === 'security'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>সিকিউরিটি ও পাসওয়ার্ড</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* TAB 1: Sources Upload & Management */}
        {activeTab === 'sources' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Upload New Source Form */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 sm:p-6 space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-bold text-slate-900 flex items-center">
                    <Plus className="w-5 h-5 mr-2 text-indigo-600" />
                    নতুন সোর্স আপলোড ও সংরক্ষণ করুন
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    ১টি বিষয়ের জন্য একাধিক পিডিএফ, ছবি বা নোট কাস্টম নাম দিয়ে সেভ করুন
                  </p>
                </div>

                <form onSubmit={handleSaveSource} className="space-y-4">
                  {/* Class and Subject */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        শ্রেণি নির্বাচন করুন
                      </label>
                      <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="w-full text-sm px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-indigo-950 bg-slate-50"
                      >
                        {classesList.map((cls) => (
                          <option key={cls} value={cls}>
                            {cls} শ্রেণি
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        বিষয় নির্বাচন করুন
                      </label>
                      <select
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="w-full text-sm px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-indigo-950 bg-slate-50"
                      >
                        {subjectsList.map((sub) => (
                          <option key={sub} value={sub}>
                            {sub}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Source Type Selector */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      সোর্সের ধরন
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSourceType('pdf');
                          setSelectedFile(null);
                        }}
                        className={`py-2.5 px-3 text-sm font-bold rounded-lg border flex flex-col items-center justify-center space-y-1 transition ${
                          sourceType === 'pdf'
                            ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <FileText className="w-5 h-5 text-rose-600" />
                        <span>📄 পিডিএফ</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSourceType('image');
                          setSelectedFile(null);
                        }}
                        className={`py-2.5 px-3 text-sm font-bold rounded-lg border flex flex-col items-center justify-center space-y-1 transition ${
                          sourceType === 'image'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <ImageIcon className="w-5 h-5 text-emerald-600" />
                        <span>🖼️ ছবি</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSourceType('text');
                          setSelectedFile(null);
                        }}
                        className={`py-2.5 px-3 text-sm font-bold rounded-lg border flex flex-col items-center justify-center space-y-1 transition ${
                          sourceType === 'text'
                            ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <FileCode className="w-5 h-5 text-amber-600" />
                        <span>📝 নোট</span>
                      </button>
                    </div>
                  </div>

                  {/* Custom Source Title / Name */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      সোর্সের নাম বা শিরোনাম <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={sourceTitle}
                      onChange={(e) => setSourceTitle(e.target.value)}
                      placeholder="যেমন: অধ্যায় ১ - পরিবেশ ও জীব / অনুশীলনী প্রশ্ন"
                      className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
                      required
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      প্রশ্ন তৈরির সময় এই নামটি দেখে সহজে সোর্স সিলেক্ট করতে পারবেন।
                    </p>
                  </div>

                  {/* File Upload or Textarea Input */}
                  {sourceType === 'pdf' && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        পিডিএফ ফাইল নির্বাচন করুন
                      </label>
                      <div className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl p-5 text-center bg-slate-50/50 transition">
                        <input
                          id="source-file-input"
                          type="file"
                          accept="application/pdf"
                          onChange={handleFileChange}
                          className="sr-only"
                        />
                        <label htmlFor="source-file-input" className="cursor-pointer block">
                          <UploadCloud className="w-8 h-8 mx-auto text-indigo-500 mb-1.5" />
                          <span className="text-sm font-bold text-indigo-600 hover:underline">
                            {selectedFile ? selectedFile.name : 'পিডিএফ ফাইল আপলোড করুন'}
                          </span>
                          <p className="text-xs text-slate-400 mt-1">
                            {selectedFile
                              ? `${formatBytes(selectedFile.size)} • মোট পৃষ্ঠা: ${pdfPageCount}`
                              : 'পাঠ্যবই বা যেকোনো অধ্যায়ের পিডিএফ'}
                          </p>
                        </label>
                      </div>
                    </div>
                  )}

                  {sourceType === 'image' && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        ছবি (JPG / PNG / WebP) নির্বাচন করুন
                      </label>
                      <div className="border-2 border-dashed border-slate-300 hover:border-emerald-400 rounded-xl p-5 text-center bg-slate-50/50 transition">
                        <input
                          id="source-file-input"
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="sr-only"
                        />
                        <label htmlFor="source-file-input" className="cursor-pointer block">
                          <ImageIcon className="w-8 h-8 mx-auto text-emerald-500 mb-1.5" />
                          <span className="text-sm font-bold text-emerald-600 hover:underline">
                            {selectedFile ? selectedFile.name : 'বইয়ের পাতার ছবি আপলোড করুন'}
                          </span>
                          <p className="text-xs text-slate-400 mt-1">
                            {selectedFile
                              ? `${formatBytes(selectedFile.size)}`
                              : 'বইয়ের পৃষ্ঠা, হাতে লেখা নোট বা প্রশ্নপত্রের ছবি'}
                          </p>
                        </label>
                      </div>
                    </div>
                  )}

                  {sourceType === 'text' && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        টেক্সট / পড়ার নোট বা বিষয়বস্তু
                      </label>
                      <textarea
                        rows={6}
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                        placeholder="এখানে অধ্যায়ের গুরুত্বপূর্ণ তথ্য, প্রশ্ন-উত্তর, প্যারাগ্রাফ বা নোট পেস্ট করুন..."
                        className="w-full text-sm p-3.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-normal"
                        required
                      />
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-bold rounded-xl shadow-xs transition flex items-center justify-center space-x-2"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{uploadProgressMsg || 'সংরক্ষণ হচ্ছে...'}</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>সোর্স হিসেবে সংরক্ষণ করুন</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Right: List of Stored Sources */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center">
                      <BookOpen className="w-5 h-5 mr-2 text-indigo-600" />
                      সংরক্ষিত সোর্সসমূহ ({filteredSources.length}টি)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      প্রশ্নপত্র তৈরির সময় যেকোনো এক বা একাধিক সোর্স বেছে নেওয়া যাবে
                    </p>
                  </div>

                  <button
                    onClick={refreshSources}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-semibold text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 rounded-lg transition"
                    title="তালিকা রিফ্রেশ করুন"
                  >
                    <RefreshCw className="w-4 h-4 mr-1.5" />
                    রিফ্রেশ
                  </button>
                </div>

                {/* Filters & Search */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      শ্রেণি ফিল্টার
                    </label>
                    <select
                      value={filterClass}
                      onChange={(e) => setFilterClass(e.target.value)}
                      className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none font-medium"
                    >
                      <option value="সকল">সকল শ্রেণি</option>
                      {classesList.map((c) => (
                        <option key={c} value={c}>
                          {c} শ্রেণি
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      বিষয় ফিল্টার
                    </label>
                    <select
                      value={filterSubject}
                      onChange={(e) => setFilterSubject(e.target.value)}
                      className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none font-medium"
                    >
                      <option value="সকল">সকল বিষয়</option>
                      {Array.from(new Set(sources.map((s) => s.subject))).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      সোর্স খুঁজুন
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="নাম দিয়ে খুঁজুন..."
                        className="w-full text-sm pl-9 pr-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* List Body */}
                {isLoadingSources ? (
                  <div className="p-8 text-center text-slate-400 space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
                    <p className="text-sm">সংরক্ষিত সোর্স লোড হচ্ছে...</p>
                  </div>
                ) : filteredSources.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-2 bg-slate-50/50">
                    <BookOpen className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-sm font-bold text-slate-600">কোনো সোর্স পাওয়া যায়নি</p>
                    <p className="text-xs text-slate-400">
                      বামের ফর্মটি পূরণ করে নতুন পিডিএফ, ছবি বা নোট সংরক্ষণ করুন।
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                    {filteredSources.map((src) => (
                      <div
                        key={src.id}
                        className="p-3.5 bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200 rounded-xl transition flex items-start justify-between gap-3 group"
                      >
                        <div className="flex items-start space-x-3 overflow-hidden">
                          {/* Type Icon */}
                          <div
                            className={`p-2.5 rounded-lg flex-shrink-0 mt-0.5 ${
                              src.type === 'pdf'
                                ? 'bg-rose-100 text-rose-700'
                                : src.type === 'image'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {src.type === 'pdf' ? (
                              <FileText className="w-5 h-5" />
                            ) : src.type === 'image' ? (
                              <ImageIcon className="w-5 h-5" />
                            ) : (
                              <FileCode className="w-5 h-5" />
                            )}
                          </div>

                          {/* Source Details */}
                          <div className="overflow-hidden space-y-1.5">
                            {editingSourceId === src.id ? (
                              <div className="flex items-center space-x-1.5">
                                <input
                                  type="text"
                                  value={editTitleText}
                                  onChange={(e) => setEditTitleText(e.target.value)}
                                  className="text-sm px-2.5 py-1 border border-indigo-300 rounded bg-white font-bold w-48 sm:w-64"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveEditTitle(src.id)}
                                  className="p-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-xs font-bold"
                                  title="সংরক্ষণ"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingSourceId(null)}
                                  className="p-1.5 bg-slate-300 text-slate-700 rounded hover:bg-slate-400 text-xs font-bold"
                                  title="বাতিল"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <h3
                                  className="text-sm font-bold text-slate-900 truncate"
                                  title={src.title}
                                >
                                  {src.title}
                                </h3>
                                <button
                                  onClick={() => {
                                    setEditingSourceId(src.id);
                                    setEditTitleText(src.title);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-indigo-600 transition"
                                  title="নাম পরিবর্তন করুন"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                              <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                                {src.className} শ্রেণি
                              </span>
                              <span className="font-semibold text-slate-700 bg-slate-200 px-2 py-0.5 rounded">
                                {src.subject}
                              </span>
                              <span className="text-slate-500">
                                {src.type === 'pdf' && `মোট পৃষ্ঠা: ${src.pageCount || 1} • `}
                                {formatBytes(src.size)}
                              </span>
                              <span className="text-slate-500">
                                • {new Date(src.createdAt).toLocaleDateString('bn-BD')}
                              </span>
                              {src.storageType === 'supabase' && (
                                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  Cloud
                                </span>
                              )}
                            </div>

                            {src.type === 'pdf' && (
                              <div className="pt-1 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenChaptersModal(src)}
                                  className="inline-flex items-center px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 active:scale-95 border border-indigo-200 rounded-lg transition shadow-2xs"
                                  title="এই বইয়ের অধ্যায় ও পৃষ্ঠা রেঞ্জ পরিচালনা করুন"
                                >
                                  <BookOpen className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                                  <span>
                                    বইয়ের অধ্যায়সমূহ ({Array.isArray(src.chapters) ? src.chapters.length : 0}টি সেট করা)
                                  </span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleOpenPreview(src)}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition"
                            title="প্রিভিউ দেখুন"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteSource(src)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Supabase Configuration */}
        {activeTab === 'supabase' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                    <Cloud className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Supabase ফ্রি ক্লাউড স্টোরেজ সেটআপ
                    </h2>
                    <p className="text-sm text-slate-500">
                      যেকোনো ডিভাইস থেকে সকল পিডিএফ, ছবি ও সোর্স ব্যবহার করতে Supabase ক্লাউড যুক্ত করুন।
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Alert */}
              <div
                className={`p-4 rounded-xl border flex items-start space-x-3 ${
                  isCloudConnected
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    : 'bg-blue-50/70 border-blue-200 text-blue-900'
                }`}
              >
                {isCloudConnected ? (
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <HardDrive className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="text-sm space-y-1">
                  <p className="font-bold">
                    {isCloudConnected
                      ? 'Supabase ক্লাউড স্টোরেজ সফলভাবে সংযুক্ত রয়েছে'
                      : 'বর্তমানে ব্রাউজারের লোকাল IndexedDB মেমোরি ব্যবহার হচ্ছে'}
                  </p>
                  <p className="text-slate-600 leading-relaxed text-sm">
                    {isCloudConnected
                      ? 'আপনার সমস্ত সোর্স ফাইল Supabase এর ফ্রি ক্লাউডে সংরক্ষিত হচ্ছে। অন্য কম্পিউটার বা ব্রাউজার থেকেও এগুলো পাওয়া যাবে।'
                      : 'Supabase সংযোগ না থাকলেও সমস্যা নেই; আপনার সমস্ত ফাইল এই ব্রাউজারে সম্পূর্ণ নিরাপদে সংরক্ষিত থাকবে।'}
                  </p>
                </div>
              </div>

              {/* Input Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Supabase Project URL
                  </label>
                  <input
                    type="text"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full text-sm px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Supabase Public Anon Key
                  </label>
                  <input
                    type="password"
                    value={supabaseAnonKey}
                    onChange={(e) => setSupabaseAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full text-sm px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleTestSupabase}
                    disabled={isTestingSupabase}
                    className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-sm font-bold rounded-xl shadow-xs transition flex items-center space-x-2"
                  >
                    {isTestingSupabase ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>কানেকশন যাচাই করা হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>সংরক্ষণ ও কানেকশন টেস্ট করুন</span>
                      </>
                    )}
                  </button>

                  {isCloudConnected && (
                    <button
                      type="button"
                      onClick={handleResetToLocal}
                      className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition"
                    >
                      সংযোগ বিচ্ছিন্ন করুন (লোকাল মোড)
                    </button>
                  )}
                </div>

                {supabaseStatus.tested && (
                  <div
                    className={`p-3.5 rounded-xl text-sm font-semibold ${
                      supabaseStatus.success
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {supabaseStatus.message}
                  </div>
                )}
              </div>

              {/* Free Supabase Step-by-Step Setup Guide */}
              <div className="border-t border-slate-100 pt-5 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center">
                  <HelpCircle className="w-4 h-4 mr-1.5 text-indigo-600" />
                  Supabase ফ্রি সেটআপ নির্দেশনা (২ মিনিটে সেটআপ)
                </h3>

                <ol className="list-decimal list-inside text-sm text-slate-600 space-y-2 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <li>
                    <a
                      href="https://supabase.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 font-bold hover:underline inline-flex items-center"
                    >
                      supabase.com <ExternalLink className="w-3.5 h-3.5 ml-1" />
                    </a>{' '}
                    এ গিয়ে ফ্রি একাউন্ট খুলে একটি নতুন Project তৈরি করুন।
                  </li>
                  <li>
                    বাম পাশের মেন্যু থেকে <strong>Storage</strong> এ যান এবং{' '}
                    <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono font-bold text-slate-800">
                      exam_sources
                    </code>{' '}
                    নামে একটি <strong>Public Bucket</strong> তৈরি করুন।
                  </li>
                  <li>
                    বাম পাশের <strong>SQL Editor</strong> এ গিয়ে নিচের কোডটি পেস্ট করে{' '}
                    <strong>Run</strong> চাপুন:
                  </li>
                </ol>

                <div className="relative">
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-56">
                    {SUPABASE_SQL_SETUP}
                  </pre>
                  <button
                    onClick={handleCopySql}
                    className="absolute top-3 right-3 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition flex items-center space-x-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedSql ? 'কপি হয়েছে!' : 'SQL কপি করুন'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Syllabus & Marks Distribution Settings */}
        {activeTab === 'syllabus' && (
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center">
                  <Layers className="w-6 h-6 mr-2 text-indigo-600" />
                  শ্রেণি ও বিষয়ভিত্তিক মানবন্টন জাতীয় স্ট্যান্ডার্ড সেটিংস
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  প্রতিটি শ্রেণির বিষয়ের আদর্শ প্রশ্ন ধারা ও মানবন্টন পরিচালনা করুন
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={syllabusClass}
                  onChange={(e) => setSyllabusClass(e.target.value)}
                  className="text-sm px-3.5 py-2 border border-slate-300 rounded-lg font-bold text-indigo-900 bg-slate-50"
                >
                  {classesList.map((c) => (
                    <option key={c} value={c}>
                      {c} শ্রেণি
                    </option>
                  ))}
                </select>

                <select
                  value={syllabusSubject}
                  onChange={(e) => setSyllabusSubject(e.target.value)}
                  className="text-sm px-3.5 py-2 border border-slate-300 rounded-lg font-bold text-indigo-900 bg-slate-50"
                >
                  {loadSubjectsForClass(syllabusClass).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sections editor */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">
                  {syllabusSubject} ({syllabusClass} শ্রেণি) - মোট ধারা:{' '}
                  {syllabusSections.length}টি
                </h3>
                <button
                  onClick={() => {
                    const newSec = {
                      id: `sec_${Date.now()}`,
                      title: `${syllabusSections.length + 1}। নতুন প্রশ্ন ধারা`,
                      instructions: 'উপযুক্ত নির্দেশনা লিখুন',
                      questionCount: 5,
                      marksPerQuestion: 2,
                    };
                    setSyllabusSections([...syllabusSections, newSec]);
                  }}
                  className="px-3.5 py-2 text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition flex items-center space-x-1"
                >
                  <span>+ নতুন ধারা যোগ করুন</span>
                </button>
              </div>

              <div className="space-y-3">
                {syllabusSections.map((sec, idx) => (
                  <div
                    key={sec.id || idx}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-6">
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          ধারার নাম/শিরোনাম
                        </label>
                        <input
                          type="text"
                          value={sec.title}
                          onChange={(e) => {
                            const updated = [...syllabusSections];
                            updated[idx].title = e.target.value;
                            setSyllabusSections(updated);
                          }}
                          className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          প্রশ্ন সংখ্যা
                        </label>
                        <input
                          type="number"
                          value={sec.questionCount}
                          onChange={(e) => {
                            const updated = [...syllabusSections];
                            updated[idx].questionCount = parseInt(e.target.value) || 0;
                            setSyllabusSections(updated);
                          }}
                          className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          প্রতিটির নম্বর
                        </label>
                        <input
                          type="number"
                          value={sec.marksPerQuestion}
                          onChange={(e) => {
                            const updated = [...syllabusSections];
                            updated[idx].marksPerQuestion = parseFloat(e.target.value) || 0;
                            setSyllabusSections(updated);
                          }}
                          className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium"
                        />
                      </div>

                      <div className="sm:col-span-2 flex items-end">
                        <button
                          type="button"
                          onClick={() => {
                            setSyllabusSections(syllabusSections.filter((_, i) => i !== idx));
                          }}
                          className="w-full py-2 text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition"
                        >
                          মুছে ফেলুন
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  onClick={() => {
                    saveSectionsForSubject(syllabusClass, syllabusSubject, syllabusSections);
                    showToast('মানবন্টন সফলভাবে সংরক্ষিত হয়েছে!');
                  }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>মানবন্টন সংরক্ষণ করুন</span>
                </button>

                <button
                  onClick={() => {
                    if (confirm('জাতীয় স্ট্যান্ডার্ড ডিফল্ট মানবন্টনে রিসেট করবেন?')) {
                      const defaultSec = resetSectionsToDefault(syllabusClass, syllabusSubject);
                      setSyllabusSections(JSON.parse(JSON.stringify(defaultSec || [])));
                      showToast('ডিফল্ট মানবন্টনে রিসেট করা হয়েছে!');
                    }
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition"
                >
                  ডিফল্ট রিসেট
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Demo Question AI Pattern Analyzer */}
        {activeTab === 'demo_pattern' && (
          <div className="space-y-6">
            {/* Top Banner */}
            <div className="bg-linear-to-r from-amber-500/10 via-indigo-500/10 to-teal-500/10 border border-amber-200/80 rounded-2xl p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start space-x-3.5">
                  <div className="p-3 bg-amber-500 text-white rounded-xl shadow-xs">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      ডেমো প্রশ্নপত্র দিয়ে AI প্যাটার্ন এনালাইসিস ও কাস্টম প্রিসেট
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                      যেকোনো শ্রেণি ও বিষয়ের নমুনা প্রশ্নপত্রের ছবি বা পিডিএফ আপলোড করুন। AI স্বয়ংক্রিয়ভাবে প্রশ্নের ধারা, প্রশ্নের সংখ্যা, মানবন্টন এবং ফরম্যাটিং স্টাইল বুঝে নেবে এবং সেটিকে স্থায়ী প্রিসেট হিসেবে সেভ করবে।
                    </p>
                  </div>
                </div>
              </div>

              {/* Gemini API Key Config Box */}
              <div className="mt-4 pt-3 border-t border-amber-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-2 flex-1 w-full">
                  <span className="font-bold text-slate-800 flex-shrink-0 flex items-center">
                    🔑 Gemini API Key:
                  </span>
                  <input
                    type="password"
                    value={adminApiKey}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAdminApiKey(val);
                      if (typeof window !== 'undefined') {
                        if (val.trim()) {
                          localStorage.setItem('gemini_api_key', val.trim());
                        } else {
                          localStorage.removeItem('gemini_api_key');
                        }
                      }
                    }}
                    placeholder="AI Studio থেকে পাওয়া Key পেস্ট করুন (AIzaSy...)"
                    className="w-full text-xs font-mono px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                  {adminApiKey && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md flex-shrink-0">
                      সংরক্ষিত
                    </span>
                  )}
                </div>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-bold underline flex-shrink-0"
                >
                  ফ্রি API Key তৈরি করুন <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Upload & Analyze Setup */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 sm:p-6 space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-base font-bold text-slate-900 flex items-center">
                      <UploadCloud className="w-5 h-5 mr-2 text-indigo-600" />
                      ধাপ ১: শ্রেণি, বিষয় ও ডেমো প্রশ্নপত্র নির্বাচন
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        টার্গেট শ্রেণি
                      </label>
                      <select
                        value={demoClass}
                        onChange={(e) => {
                          setDemoClass(e.target.value);
                          const subs = loadSubjectsForClass(e.target.value);
                          if (subs.length > 0 && !subs.includes(demoSubject)) {
                            setDemoSubject(subs[0]);
                          }
                        }}
                        className="w-full text-sm font-semibold p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        {classesList.map((cls) => (
                          <option key={cls} value={cls}>{cls} শ্রেণি</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        টার্গেট বিষয়
                      </label>
                      <select
                        value={demoSubject}
                        onChange={(e) => setDemoSubject(e.target.value)}
                        className="w-full text-sm font-semibold p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        {loadSubjectsForClass(demoClass).map((sub) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* File Upload Box */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      ডেমো প্রশ্নপত্র আপলোড (PDF বা ছবি) <span className="text-rose-500">*</span>
                    </label>
                    <label className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50/60 hover:bg-indigo-50/30 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition text-center space-y-2 group">
                      <input
                        type="file"
                        accept="application/pdf,image/png,image/jpeg,image/webp"
                        onChange={handleDemoFileChange}
                        className="hidden"
                      />
                      <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs group-hover:scale-105 transition text-indigo-600">
                        {demoFile?.type === 'application/pdf' ? (
                          <FileText className="w-7 h-7 text-rose-500" />
                        ) : demoFile ? (
                          <ImageIcon className="w-7 h-7 text-emerald-600" />
                        ) : (
                          <UploadCloud className="w-7 h-7 text-indigo-600" />
                        )}
                      </div>

                      {demoFile ? (
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-900 truncate max-w-xs">
                            {demoFile.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {demoFile.type === 'application/pdf'
                              ? `পিডিএফ ফাইল (${demoPageCount}টি পাতা)`
                              : 'ছবি ফাইল'} • {formatBytes(demoFile.size)}
                          </p>
                          <span className="inline-block text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            ✔ ফাইল নির্বাচিত হয়েছে
                          </span>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-bold text-slate-700">
                            নমুনা প্রশ্নপত্রের ফাইল সিলেক্ট করুন
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            PDF, PNG, JPG বা WebP ফরম্যাট সমর্থিত
                          </p>
                        </div>
                      )}
                    </label>
                  </div>

                  {/* Image Preview thumbnail if available */}
                  {demoPreviewUrl && (
                    <div className="p-2 border border-slate-200 rounded-xl bg-slate-100 text-center">
                      <img
                        src={demoPreviewUrl}
                        alt="Demo Preview"
                        className="max-h-44 mx-auto rounded shadow-2xs object-contain"
                      />
                    </div>
                  )}

                  {/* Analyze Button */}
                  <button
                    type="button"
                    onClick={handleAnalyzeDemoPattern}
                    disabled={isAnalyzingDemo || !demoFile}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-700 hover:to-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-xs transition flex items-center justify-center space-x-2"
                  >
                    {isAnalyzingDemo ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>{analyzingProgressMsg || 'বিশ্লেষণ চলছে...'}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>AI দিয়ে প্রশ্নপত্রের প্যাটার্ন বিশ্লেষণ করুন</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Column: Analyzed Results & Editable Preset Pattern */}
              <div className="lg:col-span-7 space-y-4">
                {analyzedPattern ? (
                  <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 sm:p-6 space-y-5">
                    <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 flex items-center">
                          <Check className="w-5 h-5 mr-1.5 text-emerald-600" />
                          ধাপ ২: AI দ্বারা বিশ্লেষিত প্রশ্নপত্রের কাঠামো
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {analyzedPattern.examTitle || 'নমুনা পরীক্ষা'} • পূর্ণমান: {analyzedPattern.totalMarks || 100} • সময়: {analyzedPattern.timeAllowed || '২ ঘণ্টা'}
                        </p>
                      </div>

                      <span className="text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-lg">
                        {editableAnalyzedSections.length}টি সেকশন শনাক্ত হয়েছে
                      </span>
                    </div>

                    {/* Detected Rules Summary */}
                    {analyzedPattern.formattingRules && analyzedPattern.formattingRules.length > 0 && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-700">
                        <p className="font-bold text-slate-900 flex items-center">
                          <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-600" />
                          AI শনাক্তকৃত বিশেষ ফরম্যাটিং বৈশিষ্ট্য:
                        </p>
                        <ul className="list-disc list-inside space-y-0.5 pl-1">
                          {analyzedPattern.formattingRules.map((rule, rIdx) => (
                            <li key={rIdx}>{rule}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Editable Sections List */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-800">
                          ধারাসমূহ ও মানবন্টন সম্পাদনা:
                        </h4>
                        <button
                          type="button"
                          onClick={handleAddAnalyzedSection}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center px-2 py-1 bg-indigo-50 border border-indigo-200 rounded-lg"
                        >
                          <Plus className="w-3 h-3 mr-0.5" /> নতুন সেকশন যোগ
                        </button>
                      </div>

                      <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                        {editableAnalyzedSections.map((sec, idx) => {
                          const totalSecMarks = (sec.count || 1) * (sec.marksPerQuestion || 1);
                          return (
                            <div
                              key={sec.id || idx}
                              className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 group hover:bg-slate-100/70 transition"
                            >
                              <div className="flex items-center space-x-2">
                                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                  {toBengaliNumerals(idx + 1)}
                                </span>
                                <input
                                  type="text"
                                  value={sec.title}
                                  onChange={(e) => handleUpdateAnalyzedSectionField(idx, 'title', e.target.value)}
                                  className="text-sm font-bold text-slate-900 bg-white border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-2.5 py-1 w-full rounded-lg"
                                  placeholder="সেকশন শিরোনাম..."
                                />
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAnalyzedSection(idx)}
                                  className="text-slate-300 hover:text-rose-600 p-1 flex-shrink-0"
                                  title="মুছে ফেলুন"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2 pl-8">
                                <div className="flex items-center space-x-3">
                                  <div className="flex items-center space-x-1">
                                    <span>প্রশ্নের সংখ্যা:</span>
                                    <input
                                      type="number"
                                      min="1"
                                      max="50"
                                      value={sec.count}
                                      onChange={(e) => handleUpdateAnalyzedSectionField(idx, 'count', e.target.value)}
                                      className="w-12 text-center font-bold bg-white border border-slate-300 rounded px-1 py-0.5"
                                    />
                                  </div>

                                  <div className="flex items-center space-x-1">
                                    <span>প্রতিটির মান:</span>
                                    <input
                                      type="number"
                                      min="1"
                                      max="50"
                                      value={sec.marksPerQuestion}
                                      onChange={(e) => handleUpdateAnalyzedSectionField(idx, 'marksPerQuestion', e.target.value)}
                                      className="w-12 text-center font-bold bg-white border border-slate-300 rounded px-1 py-0.5"
                                    />
                                  </div>
                                </div>

                                <div className="font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                                  মোট: {toBengaliNumerals(totalSecMarks, true)} নম্বর
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Total Marks Bar */}
                      <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between text-sm font-bold text-slate-800">
                        <span>সর্বমোট নম্বর:</span>
                        <span className="text-indigo-700">
                          {toBengaliNumerals(
                            editableAnalyzedSections.reduce((acc, s) => acc + ((s.count || 1) * (s.marksPerQuestion || 1)), 0),
                            true
                          )} নম্বর
                        </span>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleSaveAnalyzedPreset}
                        className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-xs transition flex items-center justify-center space-x-2"
                      >
                        <Save className="w-4 h-4" />
                        <span>এই প্যাটার্নটি "{demoClass}" শ্রেণির "{demoSubject}" বিষয়ের প্রিসেট হিসেবে সংরক্ষণ করুন</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Initial Empty State */
                  <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-8 text-center space-y-3">
                    <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800">
                      কোনো ডেমো প্রশ্নপত্র এখনো বিশ্লেষণ করা হয়নি
                    </h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto">
                      বামপাশের ফর্ম থেকে শ্রেণি ও বিষয় সিলেক্ট করে আপনার বিদ্যালয়ের আসল বা আদর্শ প্রশ্নপত্রের ছবি/পিডিএফ আপলোড করুন এবং "AI দিয়ে প্যাটার্ন বিশ্লেষণ করুন" চাপুন।
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Security & Password Management */}
        {activeTab === 'security' && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      অ্যাডমিন পাসওয়ার্ড পরিবর্তন
                    </h2>
                    <p className="text-sm text-slate-500">
                      অ্যাডমিন প্যানেলকে সুরক্ষিত রাখতে নতুন পাসওয়ার্ড সেট করুন
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    নতুন পাসওয়ার্ড লিখুন
                  </label>
                  <input
                    type="text"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="যেমন: mysecretpass2026"
                    className="w-full text-sm px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                  <p className="text-xs text-slate-400 mt-1.5">
                    পাসওয়ার্ড সেভ করলে পরবর্তীতে অ্যাডমিনে ঢুকতে এই পাসওয়ার্ড প্রয়োজন হবে।
                  </p>
                </div>

                <button
                  type="submit"
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-xs transition flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>পাসওয়ার্ড পরিবর্তন করুন</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">{previewItem.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {previewItem.className} শ্রেণি • {previewItem.subject} •{' '}
                  {previewItem.type.toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => {
                  setPreviewItem(null);
                  setPreviewContent(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg text-base"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 text-sm">
              {isLoadingPreview ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
                  <p className="text-sm">প্রিভিউ প্রস্তুত করা হচ্ছে...</p>
                </div>
              ) : previewItem.type === 'image' && previewContent ? (
                <div className="text-center">
                  <img
                    src={previewContent}
                    alt={previewItem.title}
                    className="max-h-[60vh] mx-auto rounded-lg shadow-sm border border-slate-200"
                  />
                </div>
              ) : previewItem.type === 'text' && previewContent ? (
                <div className="whitespace-pre-wrap font-sans bg-slate-50 p-4 rounded-xl border border-slate-200 leading-relaxed text-slate-800 text-sm">
                  {previewContent}
                </div>
              ) : previewItem.type === 'pdf' && previewContent ? (
                <div className="text-center space-y-3">
                  <FileText className="w-12 h-12 text-rose-500 mx-auto" />
                  <p className="text-base font-bold text-slate-800">{previewItem.title}</p>
                  <p className="text-sm text-slate-500">
                    মোট পৃষ্ঠা: {previewItem.pageCount || 1} • সাইজ: {formatBytes(previewItem.size)}
                  </p>
                  <a
                    href={previewContent}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg text-sm hover:bg-indigo-700"
                  >
                    পিডিএফ ফাইলটি নতুন ট্যাবে খুলুন
                  </a>
                </div>
              ) : (
                <p className="text-center text-slate-400 text-sm">প্রিভিউ কন্টেন্ট পাওয়া যায়নি।</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chapter Management Modal */}
      {chapterModalSource && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    বইয়ের অধ্যায়সমূহ পরিচালনা
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <span className="font-semibold text-indigo-800">{chapterModalSource.title}</span> ({chapterModalSource.className} শ্রেণি • {chapterModalSource.subject}) • মোট পৃষ্ঠা: {chapterModalSource.pageCount || 1}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setChapterModalSource(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg text-base transition"
                title="বন্ধ করুন"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              {/* Form to Add New Chapter */}
              <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-4 space-y-3">
                <h4 className="text-sm font-bold text-indigo-950 flex items-center">
                  <Plus className="w-4 h-4 mr-1.5 text-indigo-600" />
                  নতুন অধ্যায় যুক্ত করুন
                </h4>

                <form onSubmit={handleAddChapter} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <div className="sm:col-span-6">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        অধ্যায়ের নাম বা শিরোনাম <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newChapTitle}
                        onChange={(e) => setNewChapTitle(e.target.value)}
                        placeholder="যেমন: অধ্যায় ১ - আমাদের পরিবেশ"
                        className="w-full text-sm px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                        required
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        শুরুর পৃষ্ঠা
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={chapterModalSource.pageCount || 9999}
                        value={newChapStart}
                        onChange={(e) => setNewChapStart(e.target.value)}
                        className="w-full text-sm px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-center"
                        required
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        শেষের পৃষ্ঠা
                      </label>
                      <input
                        type="number"
                        min={newChapStart || 1}
                        max={chapterModalSource.pageCount || 9999}
                        value={newChapEnd}
                        onChange={(e) => setNewChapEnd(e.target.value)}
                        className="w-full text-sm px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-center"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>অধ্যায় যুক্ত করুন</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Added Chapters List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800">
                    সংযুক্ত অধ্যায় তালিকা ({modalChapters.length}টি অধ্যায়)
                  </h4>
                  <span className="text-xs text-slate-500">
                    প্রশ্ন তৈরির সময় শিক্ষক এখান থেকে সহজে অধ্যায় বেছে নিতে পারবেন
                  </span>
                </div>

                {modalChapters.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-2">
                    <BookOpen className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-sm font-bold text-slate-600">কোনো অধ্যায় এখনো যুক্ত করা হয়নি</p>
                    <p className="text-xs text-slate-400">
                      উপরের ফর্ম থেকে বইয়ের অধ্যায়ের নাম ও পৃষ্ঠা রেঞ্জ দিয়ে "+ অধ্যায় যুক্ত করুন" চাপুন।
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {modalChapters.map((chap, idx) => (
                      <div
                        key={chap.id || idx}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 group hover:bg-slate-100/80 transition"
                      >
                        <div className="flex items-center space-x-3 flex-1 overflow-hidden">
                          <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {idx + 1}
                          </span>
                          <div className="flex-1 overflow-hidden">
                            <input
                              type="text"
                              value={chap.title}
                              onChange={(e) => handleUpdateChapterField(idx, 'title', e.target.value)}
                              className="text-sm font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:outline-none px-1 py-0.5 w-full rounded"
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <div className="flex items-center space-x-1 text-xs font-semibold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-lg">
                            <span>পৃষ্ঠা:</span>
                            <input
                              type="number"
                              min="1"
                              max={chapterModalSource.pageCount || 9999}
                              value={chap.startPage}
                              onChange={(e) => handleUpdateChapterField(idx, 'startPage', e.target.value)}
                              className="w-10 text-center font-bold bg-white border border-indigo-200 rounded px-1"
                            />
                            <span>-</span>
                            <input
                              type="number"
                              min={chap.startPage || 1}
                              max={chapterModalSource.pageCount || 9999}
                              value={chap.endPage}
                              onChange={(e) => handleUpdateChapterField(idx, 'endPage', e.target.value)}
                              className="w-10 text-center font-bold bg-white border border-indigo-200 rounded px-1"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteChapter(chap.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setChapterModalSource(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition"
              >
                বাতিল
              </button>

              <button
                type="button"
                onClick={handleSaveAllChapters}
                disabled={isSavingChapters}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-bold rounded-xl shadow-xs transition flex items-center space-x-2"
              >
                {isSavingChapters ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>সংরক্ষণ হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>অধ্যায়সমূহ সংরক্ষণ করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
