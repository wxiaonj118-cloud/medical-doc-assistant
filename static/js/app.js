// Main application JavaScript

// Global variables
let API_BASE = window.location.origin;
let currentFile = null;
let currentAnalysisData = null; // Store analysis data for printing

// Supabase Configuration - RENAMED to avoid conflict with global supabase
let supabaseClient = null;  // Changed from 'supabase' to 'supabaseClient'
let supabaseInitialized = false;

// Initialize Supabase using backend-injected config
async function initSupabase() {
    console.log('Initializing Supabase...');
    
    try {
        // Check if Supabase library is loaded
        if (typeof window.supabase === 'undefined') {
            console.warn('Supabase library not loaded. Loading dynamically...');
            await loadSupabaseLibrary();
        }
        
        // Get credentials from backend-injected config
        const supabaseUrl = window.CONFIG?.supabaseUrl;
        const supabaseKey = window.CONFIG?.supabaseKey;
        const databaseEnabled = window.CONFIG?.features?.databaseEnabled;
        
        // Check if database features are enabled
        if (!databaseEnabled) {
            console.log('ℹ️ Database features disabled in config');
            updateDatabaseStatus('disabled', 'Not configured');
            return false;
        }
        
        // Check if credentials exist
        if (!supabaseUrl || !supabaseKey) {
            console.log('ℹ️ Supabase credentials not provided in .env');
            updateDatabaseStatus('disabled', 'Not configured');
            return false;
        }
        
        // Check if using placeholder values
        if (supabaseUrl.includes('your-project-id') || supabaseKey.includes('your-anon-public-key')) {
            console.warn('Supabase credentials contain placeholder values. Update your .env file with actual credentials.');
            updateDatabaseStatus('disabled', 'Update .env');
            return false;
        }
        
        // Initialize Supabase client - USING DIFFERENT VARIABLE NAME
        if (window.supabase) {
            supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
            
            // Test the connection
            const { data, error } = await supabaseClient
                .from('analyses')
                .select('count')
                .limit(1);
            
            if (error) {
                console.error('Supabase connection test failed:', error.message);
                updateDatabaseStatus('error', 'Connection failed');
                return false;
            }
            
            supabaseInitialized = true;
            console.log('✅ Supabase initialized successfully');
            updateDatabaseStatus('connected', 'Database ready');
            
            // Show database indicator in nav
            const dbIndicator = document.getElementById('dbStatusIndicator');
            if (dbIndicator) {
                dbIndicator.style.display = 'flex';
            }
            
            return true;
        } else {
            console.warn('Supabase library not available');
            updateDatabaseStatus('disabled', 'Library missing');
            return false;
        }
        
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        updateDatabaseStatus('error', 'Init failed');
        return false;
    }
}

// Dynamically load Supabase library if not present
function loadSupabaseLibrary() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Update database status in navigation
function updateDatabaseStatus(status, message) {
    const dbIndicator = document.getElementById('dbStatusIndicator');
    const dbStatusText = document.getElementById('dbStatusText');
    
    if (!dbIndicator || !dbStatusText) return;
    
    // Remove existing status classes
    dbIndicator.classList.remove('connected', 'error', 'disabled', 'connecting');
    
    // Update based on status
    switch(status) {
        case 'connected':
            dbIndicator.classList.add('connected');
            dbIndicator.style.display = 'flex';
            dbStatusText.textContent = message || 'Connected';
            break;
        case 'error':
            dbIndicator.classList.add('error');
            dbIndicator.style.display = 'flex';
            dbStatusText.textContent = message || 'Error';
            break;
        case 'disabled':
            dbIndicator.classList.add('disabled');
            dbIndicator.style.display = 'flex';
            dbStatusText.textContent = message || 'Disabled';
            break;
        case 'connecting':
            dbIndicator.classList.add('connecting');
            dbIndicator.style.display = 'flex';
            dbStatusText.textContent = message || 'Connecting...';
            break;
        default:
            dbIndicator.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Medical Document Assistant...');
    console.log('Config loaded:', window.CONFIG?.appName, 'v' + window.CONFIG?.version);
    
    // Initialize theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    
    // Initialize all event listeners
    initThemeToggle();
    initFileHandling();
    initButtons();
    initModal();
    initToast();
    
    // Initialize Supabase (async - won't block app)
    initSupabase().then(initialized => {
        if (initialized) {
            console.log('Database features enabled');
        } else {
            console.log('Running in offline mode (no database)');
        }
    });
    
    // Check API health on load
    checkAPIHealth();
});

// ========== THEME FUNCTIONS ==========
function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// ========== FILE HANDLING FUNCTIONS ==========
function initFileHandling() {
    console.log('Initializing file handling...');
    
    const fileInput = document.getElementById('fileInput');
    const uploadZone = document.getElementById('uploadZone');
    const chooseFileButton = document.getElementById('chooseFileButton');
    const clearFileButton = document.getElementById('clearFileButton');
    
    if (!fileInput || !uploadZone || !chooseFileButton) {
        console.error('Required elements not found');
        return;
    }
    
    // Choose File button
    chooseFileButton.addEventListener('click', function(e) {
        e.stopPropagation();
        fileInput.click();
    });
    
    // Clear File button
    if (clearFileButton) {
        clearFileButton.addEventListener('click', function(e) {
            e.stopPropagation();
            clearFile();
        });
    }
    
    // File input change
    fileInput.addEventListener('change', function(e) {
        e.stopPropagation();
        if (this.files.length > 0) {
            handleFiles(this.files);
        }
    });
    
    // Upload zone click
    uploadZone.addEventListener('click', function(e) {
        // Only trigger if clicking on the zone itself (not buttons inside)
        if (e.target === this || e.target.classList.contains('upload-zone')) {
            fileInput.click();
        }
    });
    
    // Setup drag and drop
    setupDragAndDrop(uploadZone, fileInput);
}

function setupDragAndDrop(uploadZone, fileInput) {
    // Prevent default behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight on drag over
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadZone.addEventListener(eventName, function() {
            uploadZone.classList.add('highlight');
        }, false);
    });
    
    // Remove highlight
    ['dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, function() {
            uploadZone.classList.remove('highlight');
        }, false);
    });
    
    // Handle drop
    uploadZone.addEventListener('drop', function(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            // Update file input
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(files[0]);
            fileInput.files = dataTransfer.files;
            
            handleFiles(files);
        }
    }, false);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleFiles(files) {
    if (files.length === 0) return;
    
    const file = files[0];
    currentFile = file;
    updateFileInfo(file);
}

function updateFileInfo(file) {
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const fileInfo = document.getElementById('fileInfo');
    const uploadButton = document.getElementById('uploadButton');
    
    if (!file || !fileName || !fileSize || !fileInfo || !uploadButton) {
        console.error('Required elements not found');
        return;
    }
    
    // Update file icon based on file type
    const fileIcon = fileInfo.querySelector('i');
    if (fileIcon) {
        if (file.name.toLowerCase().endsWith('.pdf')) {
            fileIcon.className = 'fas fa-file-pdf';
            fileIcon.style.color = '#ff3b30';
        } else if (file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc')) {
            fileIcon.className = 'fas fa-file-word';
            fileIcon.style.color = '#2b579a';
        } else if (file.name.toLowerCase().endsWith('.txt')) {
            fileIcon.className = 'fas fa-file-alt';
            fileIcon.style.color = '#666666';
        }
    }
    
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    fileInfo.style.display = 'block';
    uploadButton.disabled = false;
    
    console.log('File loaded successfully:', file.name, formatFileSize(file.size));
}

function clearFile() {
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const uploadButton = document.getElementById('uploadButton');
    
    if (fileInput) {
        fileInput.value = '';
    }
    if (fileInfo) {
        fileInfo.style.display = 'none';
    }
    if (uploadButton) {
        uploadButton.disabled = true;
    }
    
    currentFile = null;
    console.log('File cleared');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ========== BUTTON HANDLERS ==========
function initButtons() {
    // Analyze Text button
    const analyzeTextButton = document.getElementById('analyzeTextButton');
    if (analyzeTextButton) {
        analyzeTextButton.addEventListener('click', analyzeText);
    }
    
    // Upload/Analyze Document button
    const uploadButton = document.getElementById('uploadButton');
    if (uploadButton) {
        uploadButton.addEventListener('click', uploadFile);
    }
    
    // Load Sample button
    const loadSampleButton = document.getElementById('loadSampleButton');
    if (loadSampleButton) {
        loadSampleButton.addEventListener('click', loadSampleText);
    }
    
    // Test API button
    const testAPIButton = document.getElementById('testAPIButton');
    if (testAPIButton) {
        testAPIButton.addEventListener('click', testAPI);
    }
    
    // Print button
    const printButton = document.getElementById('printButton');
    if (printButton) {
        printButton.addEventListener('click', printReport);
    }
    
    // Database Test button (optional - for testing)
    const testDBButton = document.getElementById('testDBButton');
    if (testDBButton) {
        testDBButton.addEventListener('click', testDatabaseConnection);
    }
}

// ========== API FUNCTIONS ==========
async function checkAPIHealth() {
    try {
        const response = await fetch(`${API_BASE}/api/health`);
        const data = await response.json();
        console.log('API Health:', data);
        return data.status === 'healthy';
    } catch (error) {
        console.error('API Health Check Failed:', error);
        return false;
    }
}

// ========== CLEANUP FUNCTIONS ==========

/**
 * Delete file from storage and all database records
 */
async function deleteAllRecords(fileId, analysisId, storagePath) {
    if (!supabaseInitialized || !supabaseClient) {
        throw new Error('Supabase not initialized');
    }
    
    const results = {
        storage: false,
        documents: false,
        analyses: false
    };
    
    try {
        // 1. Delete from storage first (if path exists)
        if (storagePath) {
            try {
                const { error: storageError } = await supabaseClient.storage
                    .from('medical-documents')
                    .remove([storagePath]);
                
                if (!storageError) {
                    results.storage = true;
                    console.log('✅ Deleted file from storage:', storagePath);
                } else {
                    console.warn('⚠️ Storage deletion warning:', storageError.message);
                }
            } catch (storageError) {
                console.warn('⚠️ Storage deletion error:', storageError);
            }
        }
        
        // 2. Delete from analyses table
        if (analysisId) {
            try {
                const { error: analysisError } = await supabaseClient
                    .from('analyses')
                    .delete()
                    .eq('id', analysisId);
                
                if (!analysisError) {
                    results.analyses = true;
                    console.log('✅ Deleted analysis record:', analysisId);
                }
            } catch (analysisError) {
                console.warn('⚠️ Analysis deletion error:', analysisError);
            }
        }
        
        // 3. Delete from documents table
        if (fileId) {
            try {
                const { error: documentError } = await supabaseClient
                    .from('documents')
                    .delete()
                    .eq('id', fileId);
                
                if (!documentError) {
                    results.documents = true;
                    console.log('✅ Deleted document record:', fileId);
                }
            } catch (documentError) {
                console.warn('⚠️ Document deletion error:', documentError);
            }
        }
        
        return results;
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        throw error;
    }
}

/**
 * Simple delay function
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        showToast('Please select a file first', 'error');
        return;
    }
    
    const file = fileInput.files[0];
    if (!file) {
        showToast('No file selected', 'error');
        return;
    }
    
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
        showToast('File too large. Maximum size is 10MB.', 'error');
        return;
    }
    
    showLoading();
    
    // Step 1: Upload to database if available
    let fileUrl = null;
    let dbFileId = null;
    let storagePath = null;
    let analysisDbId = null;
    
    if (supabaseInitialized) {
        try {
            console.log('Attempting to upload file to database...');
            const dbResult = await uploadToDatabase(file);
            fileUrl = dbResult.url;
            dbFileId = dbResult.id;
            storagePath = dbResult.path;
            console.log('✅ File saved to database successfully:', dbFileId);
        } catch (dbError) {
            console.error('❌ Database upload failed:', dbError);
            console.error('Error details:', {
                message: dbError.message,
                stack: dbError.stack,
                code: dbError.code,
                details: dbError.details,
                hint: dbError.hint
            });
            showToast('Database upload failed: ' + dbError.message, 'error');
            // Continue without database - this is a fallback
        }
    } else {
        console.log('Supabase not initialized, skipping database upload');
    }
    
    // Step 2: Process the file
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        console.log('Sending file to analysis API...');
        const response = await fetch(`${API_BASE}/api/test/upload`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        console.log('Analysis API response:', result);
        
        if (response.ok) {
            // Add database info to result if available
            if (dbFileId) {
                result.db_file_id = dbFileId;
                result.file_url = fileUrl;
                result.storage_path = storagePath;
            }
            
            // Save analysis to database if available AND we have a file ID
            if (supabaseInitialized && dbFileId) {
                try {
                    console.log('Attempting to save analysis to database...');
                    const savedAnalysis = await saveAnalysisToDatabase(result, dbFileId);
                    console.log('✅ Analysis saved to database successfully:', savedAnalysis.id);
                    result.analysis_db_id = savedAnalysis.id;
                    analysisDbId = savedAnalysis.id;
                    
                    // 🗑️ AUTO-DELETE: Remove everything after successful analysis
                    console.log('🗑️ Cleaning up - deleting all records...');
                    
                    // Small delay to ensure everything is committed
                    await delay(1000);
                    
                    const deleteResults = await deleteAllRecords(dbFileId, analysisDbId, storagePath);
                    
                    // Show summary
                    const deletedItems = [];
                    if (deleteResults.storage) deletedItems.push('📁 File');
                    if (deleteResults.documents) deletedItems.push('📋 Document record');
                    if (deleteResults.analyses) deletedItems.push('📊 Analysis record');
                    
                    if (deletedItems.length > 0) {
                        console.log(`✅ Cleanup complete: ${deletedItems.join(', ')} deleted`);
                        showToast(`Analysis complete - ${deletedItems.length} items cleaned up`, 'success');
                    }
                    
                    // Remove database IDs from result display since they're deleted
                    delete result.db_file_id;
                    delete result.analysis_db_id;
                    delete result.file_url;
                    delete result.storage_path;
                    
                } catch (analysisError) {
                    console.error('❌ Failed to save analysis to database:', analysisError);
                    console.error('Analysis error details:', {
                        message: analysisError.message,
                        stack: analysisError.stack,
                        code: analysisError.code,
                        details: analysisError.details,
                        hint: analysisError.hint
                    });
                    showToast('Analysis save failed: ' + analysisError.message, 'error');
                }
            } else {
                console.log('Skipping analysis save:', 
                    !supabaseInitialized ? 'Supabase not initialized' : 
                    !dbFileId ? 'No file ID available' : 'Unknown reason');
            }
            
            showResults(result);
            hideLoading();
            clearFile(); // Clear the file input
        } else {
            hideLoading();
            showToast(result.error || 'Upload failed', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('❌ Network error during file upload:', error);
        showToast('Network error: ' + error.message, 'error');
    }
}

async function analyzeText() {
    const textArea = document.getElementById('medicalText');
    if (!textArea) {
        showToast('Text area not found', 'error');
        return;
    }
    
    const text = textArea.value.trim();
    if (!text) {
        showToast('Please enter some medical text', 'error');
        return;
    }
    
    showLoading();
    
    try {
        console.log('Sending text to analysis API...');
        const response = await fetch(`${API_BASE}/api/test/text`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: text.substring(0, 3000) })
        });
        
        const result = await response.json();
        console.log('Text analysis API response:', result);
        
        if (response.ok) {
            // Save text analysis to database if available
            if (supabaseInitialized) {
                try {
                    console.log('Attempting to save text analysis to database...');
                    const savedAnalysis = await saveTextAnalysisToDatabase(result, text);
                    console.log('✅ Text analysis saved to database successfully:', savedAnalysis.id);
                    result.analysis_db_id = savedAnalysis.id;
                    
                    // 🗑️ AUTO-DELETE: Remove the records
                    console.log('🗑️ Cleaning up - deleting text analysis records...');
                    
                    await delay(1000);
                    
                    // Delete the analysis and document records
                    if (savedAnalysis.document_id) {
                        await supabaseClient
                            .from('analyses')
                            .delete()
                            .eq('id', savedAnalysis.id);
                        
                        await supabaseClient
                            .from('documents')
                            .delete()
                            .eq('id', savedAnalysis.document_id);
                        
                        console.log('✅ Text analysis records deleted');
                        showToast('Analysis complete - records cleaned up', 'success');
                    }
                    
                    // Remove database ID from result display
                    delete result.analysis_db_id;
                    
                } catch (analysisError) {
                    console.error('❌ Failed to save/delete text analysis:', analysisError);
                    console.error('Text analysis error details:', {
                        message: analysisError.message,
                        stack: analysisError.stack,
                        code: analysisError.code,
                        details: analysisError.details,
                        hint: analysisError.hint
                    });
                    showToast('Text analysis save failed: ' + analysisError.message, 'error');
                }
            }
            
            showResults(result);
            hideLoading();
        } else {
            hideLoading();
            showToast(result.error || 'Analysis failed', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('❌ Network error during text analysis:', error);
        showToast('Network error: ' + error.message, 'error');
    }
}

function loadSampleText() {
    const textArea = document.getElementById('medicalText');
    if (!textArea) return;
    
    const sampleText = `PATIENT MEDICAL REPORT

Patient: John Doe
Age: 45
Date: 2024-02-09

LABORATORY RESULTS:
• Glucose: 98 mg/dL (Normal: 70-99)
• Cholesterol Total: 195 mg/dL (Desirable: <200)
• HDL: 55 mg/dL (Good: >40)
• LDL: 125 mg/dL (Optimal: <100)
• Triglycerides: 150 mg/dL (Normal: <150)

VITAL SIGNS:
• Blood Pressure: 118/76 mmHg
• Heart Rate: 68 bpm
• Temperature: 98.2°F

IMPRESSION:
All results within normal ranges.
Borderline LDL cholesterol noted.
No immediate concerns.

RECOMMENDATIONS:
Annual follow-up recommended.
Consider lifestyle modifications.`;
    
    textArea.value = sampleText;
    showToast('Sample text loaded', 'success');
}

async function testAPI() {
    const isHealthy = await checkAPIHealth();
    if (isHealthy) {
        showToast('API is healthy and ready! ✓', 'success');
    } else {
        showToast('API Connection Failed', 'error');
    }
}

// ========== SUPABASE DATABASE FUNCTIONS ==========
// NOTE: These functions require proper Supabase setup
async function uploadToDatabase(file) {
    if (!supabaseInitialized || !supabaseClient) {
        throw new Error('Supabase not initialized');
    }
    
    try {
        console.log('Starting database upload process for file:', file.name);
        
        const bucketName = 'medical-documents';
        
        // 🚨 REMOVED: No bucket creation code - bucket already exists!
        
        // Create a unique filename
        const timestamp = Date.now();
        const fileExt = file.name.split('.').pop() || 'bin';
        const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        const safeFileName = fileNameWithoutExt.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `${timestamp}-${safeFileName}.${fileExt}`;
        const filePath = `uploads/${fileName}`;
        
        console.log('Uploading file to storage path:', filePath);
        
        // Upload file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from(bucketName)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (uploadError) {
            console.error('Storage upload error:', uploadError);
            
            // Check if it's an RLS error
            if (uploadError.message && uploadError.message.includes('row-level security')) {
                console.error('❌ RLS policy is blocking upload. Please check your storage policies.');
                console.error('Current bucket:', bucketName);
                console.error('Make sure you have INSERT policy with WITH CHECK true');
            }
            throw uploadError;
        }
        
        console.log('✅ File uploaded to storage successfully');
        
        // Get public URL for the file
        const { data: urlData } = supabaseClient.storage
            .from(bucketName)
            .getPublicUrl(filePath);
        
        console.log('Public URL generated');
        
        // Save file metadata to database
        console.log('Saving file metadata to documents table...');
        
        const documentData = {
            filename: file.name,
            file_size: file.size,
            file_type: file.type || 'application/octet-stream',
            file_url: urlData.publicUrl,
            storage_path: filePath,
            uploaded_at: new Date().toISOString()
        };
        
        const { data: dbData, error: dbError } = await supabaseClient
            .from('documents')
            .insert([documentData])
            .select();
        
        if (dbError) {
            console.error('Documents table insert error:', dbError);
            
            if (dbError.message && dbError.message.includes('row-level security')) {
                console.error('❌ RLS policy is blocking insert to documents table.');
                console.error('Make sure you have INSERT policy WITH CHECK true');
            }
            throw dbError;
        }
        
        if (!dbData || dbData.length === 0) {
            throw new Error('No data returned from documents insert');
        }
        
        console.log('✅ File metadata saved to documents table, ID:', dbData[0].id);
        
        return {
            id: dbData[0].id,
            url: urlData.publicUrl,
            path: filePath
        };
        
    } catch (error) {
        console.error('❌ Database upload error:', error);
        throw error;
    }
}

async function saveAnalysisToDatabase(analysisData, fileId = null) {
    if (!supabaseInitialized || !supabaseClient) {
        throw new Error('Supabase not initialized');
    }
    
    try {
        console.log('Saving analysis to database...');
        console.log('File ID:', fileId);
        
        // Extract analysis text - handle different possible field names
        let analysisText = '';
        if (analysisData.analysis) {
            analysisText = analysisData.analysis;
        } else if (analysisData.ai_analysis) {
            analysisText = analysisData.ai_analysis;
        } else if (analysisData.text) {
            analysisText = analysisData.text;
        } else {
            analysisText = JSON.stringify(analysisData);
        }
        
        console.log('Analysis text length:', analysisText.length);
        
        // Prepare the insert data
        const insertData = {
            document_id: fileId,
            filename: analysisData.filename || 'Document Analysis',
            file_size: analysisData.file_size || 0,
            text_length: analysisData.text_length || analysisText.length,
            analysis: analysisText,
            analysis_type: fileId ? 'document' : 'text',
            created_at: new Date().toISOString()
        };
        
        const { data, error } = await supabaseClient
            .from('analyses')
            .insert([insertData])
            .select();
        
        if (error) {
            console.error('Analyses table insert error:', error);
            throw error;
        }
        
        if (!data || data.length === 0) {
            throw new Error('No data returned from analyses insert');
        }
        
        console.log('✅ Analysis saved to database successfully:', data[0].id);
        return data[0];
        
    } catch (error) {
        console.error('❌ Failed to save analysis:', error);
        throw error;
    }
}

async function saveTextAnalysisToDatabase(analysisData, originalText) {
    if (!supabaseInitialized || !supabaseClient) {
        throw new Error('Supabase not initialized');
    }
    
    try {
        console.log('Saving text analysis to database...');
        
        // First save the text as a document
        const { data: textDoc, error: docError } = await supabaseClient
            .from('documents')
            .insert([
                {
                    filename: `text-input-${Date.now()}.txt`,
                    file_size: new Blob([originalText]).size,
                    file_type: 'text/plain',
                    text_content: originalText,
                    uploaded_at: new Date().toISOString()
                }
            ])
            .select();
        
        if (docError) {
            console.error('Documents table insert error for text:', docError);
            throw docError;
        }
        
        if (!textDoc || textDoc.length === 0) {
            throw new Error('No data returned from documents insert');
        }
        
        console.log('Text document saved to database:', textDoc[0].id);
        
        // Then save the analysis linked to this document
        analysisData.filename = textDoc[0].filename;
        analysisData.file_size = textDoc[0].file_size;
        analysisData.text_length = originalText.length;
        
        return await saveAnalysisToDatabase(analysisData, textDoc[0].id);
        
    } catch (error) {
        console.error('❌ Failed to save text analysis:', error);
        throw error;
    }
}

async function getAnalysisHistory(limit = 10) {
    if (!supabaseInitialized || !supabaseClient) {
        throw new Error('Supabase not initialized');
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('analyses')
            .select(`
                *,
                documents (filename, file_size, uploaded_at, file_url)
            `)
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) {
            console.error('Error fetching analysis history:', error);
            throw error;
        }
        
        console.log(`Retrieved ${data?.length || 0} analysis records`);
        return data;
        
    } catch (error) {
        console.error('Failed to get analysis history:', error);
        throw error;
    }
}

async function testDatabaseConnection() {
    try {
        if (!supabaseInitialized || !supabaseClient) {
            showToast('Supabase not initialized. Please check your configuration.', 'error');
            return;
        }
        
        // Show connecting state
        updateDatabaseStatus('connecting', 'Testing...');
        
        // Try a simple query to test connection
        const { data, error } = await supabaseClient
            .from('analyses')
            .select('count')
            .limit(1);
        
        if (error) throw error;
        
        showToast('Database connection successful! ✓', 'success');
        console.log('Database test passed:', data);
        updateDatabaseStatus('connected', 'Database ready');
        
    } catch (error) {
        console.error('Database test failed:', error);
        showToast('Database connection failed: ' + error.message, 'error');
        updateDatabaseStatus('error', 'Connection failed');
    }
}

// ========== MODAL FUNCTIONS ==========
function initModal() {
    const closeModalButton = document.getElementById('closeModalButton');
    const closeModalButton2 = document.getElementById('closeModalButton2');
    
    if (closeModalButton) {
        closeModalButton.addEventListener('click', closeModal);
    }
    
    if (closeModalButton2) {
        closeModalButton2.addEventListener('click', closeModal);
    }
    
    // Close modal when clicking outside
    const modal = document.getElementById('resultModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
    }
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

function showResults(data) {
    const modal = document.getElementById('resultModal');
    const content = document.getElementById('resultContent');
    
    if (!modal || !content) return;
    
    // Store the data for printing
    currentAnalysisData = data;
    
    const timestamp = new Date().toLocaleString();
    const url = window.location.href;
    
    let html = `
        <div class="result-header">
            <h3>Medical Document Analysis Report</h3>
            ${data.filename ? `<p class="result-meta"><i class="fas fa-file"></i> Document: ${data.filename}</p>` : ''}
            ${data.text_length ? `<p class="result-meta"><i class="fas fa-ruler"></i> Text length: ${data.text_length} characters</p>` : ''}
            ${data.file_size ? `<p class="result-meta"><i class="fas fa-weight"></i> File size: ${formatFileSize(data.file_size)}</p>` : ''}
            <p class="result-meta"><i class="fas fa-calendar"></i> Analyzed: ${timestamp}</p>
            <p class="result-meta"><i class="fas fa-trash"></i> Privacy: No data stored</p>
        </div>
        <div class="result-analysis">
            <h4><i class="fas fa-stethoscope"></i> AI Analysis Results</h4>
            <div class="analysis-content">
    `;
    
    let analysisText = '';
    if (data.analysis) {
        analysisText = data.analysis;
    } else if (data.ai_analysis) {
        analysisText = data.ai_analysis;
    } else {
        analysisText = 'No analysis available';
    }
    
    // Convert markdown-style formatting to HTML with print-friendly classes
    const formattedAnalysis = analysisText
        .replace(/### (.*?)(\n|$)/g, '<h4 class="analysis-heading">$1</h4>')
        .replace(/## (.*?)(\n|$)/g, '<h3 class="analysis-heading">$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
    
    html += `<p>${formattedAnalysis}</p>`;
    
    // Add print footer
    html += `
            </div>
            <div class="print-footer">
                <p>Generated by Medical Document Assistant • ${url} • ${timestamp}</p>
                <p><em>Disclaimer: This analysis is for informational purposes only and is not a substitute for professional medical advice.</em></p>
                <p><em>🔒 Your privacy: Files are automatically deleted after analysis. No medical data is permanently stored.</em></p>
            </div>
        </div>
    `;
    
    content.innerHTML = html;
    modal.style.display = 'flex';
    
    // Scroll to top of modal content
    content.scrollTop = 0;
}

function closeModal() {
    const modal = document.getElementById('resultModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ========== PRINT REPORT FUNCTION ==========
function printReport() {
    if (!currentAnalysisData) {
        showToast('No analysis data available to print', 'error');
        return;
    }
    
    const data = currentAnalysisData;
    const timestamp = new Date().toLocaleString();
    const url = window.location.href;
    
    // Get analysis text
    let analysisText = '';
    if (data.analysis) {
        analysisText = data.analysis;
    } else if (data.ai_analysis) {
        analysisText = data.ai_analysis;
    } else {
        analysisText = 'No analysis available';
    }
    
    // Format analysis text
    const formattedAnalysis = analysisText
        .replace(/### (.*?)(\n|$)/g, '<h4>$1</h4>')
        .replace(/## (.*?)(\n|$)/g, '<h3>$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Medical Document Analysis Report</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
                
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    line-height: 1.6;
                    color: #1d1d1f;
                    padding: 40px;
                    max-width: 800px;
                    margin: 0 auto;
                    background: white;
                }
                
                .print-container {
                    padding: 30px;
                }
                
                .report-header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 2px solid #007aff;
                    padding-bottom: 20px;
                }
                
                .report-header h1 {
                    font-size: 28px;
                    font-weight: 700;
                    color: #007aff;
                    margin-bottom: 15px;
                }
                
                .report-meta {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 20px;
                    justify-content: center;
                    margin-top: 15px;
                    font-size: 14px;
                    color: #666;
                }
                
                .report-meta span {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                
                .report-meta i {
                    color: #007aff;
                }
                
                .analysis-section {
                    margin-top: 30px;
                }
                
                .analysis-section h2 {
                    font-size: 20px;
                    font-weight: 600;
                    color: #1d1d1f;
                    margin-bottom: 20px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid #eee;
                }
                
                .analysis-content {
                    background: #f5f5f7;
                    padding: 25px;
                    border-radius: 12px;
                    margin-bottom: 30px;
                    font-size: 15px;
                    line-height: 1.7;
                }
                
                .analysis-content h3 {
                    font-size: 18px;
                    margin: 20px 0 10px 0;
                    color: #1d1d1f;
                }
                
                .analysis-content h4 {
                    font-size: 16px;
                    margin: 15px 0 8px 0;
                    color: #333;
                }
                
                .analysis-content p {
                    margin-bottom: 15px;
                }
                
                .analysis-content strong {
                    color: #007aff;
                }
                
                .analysis-content ul {
                    margin: 10px 0 15px 20px;
                }
                
                .analysis-content li {
                    margin-bottom: 5px;
                }
                
                .print-footer {
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 1px solid #ddd;
                    font-size: 12px;
                    color: #666;
                    text-align: center;
                }
                
                .print-footer p {
                    margin-bottom: 8px;
                }
                
                .disclaimer {
                    font-style: italic;
                    color: #ff9500;
                    margin-top: 10px;
                }
                
                @media print {
                    @page {
                        margin: 20mm;
                    }
                    
                    body {
                        padding: 0;
                    }
                    
                    .print-container {
                        padding: 0;
                    }
                    
                    .no-print {
                        display: none !important;
                    }
                }
                
                .print-actions {
                    display: none;
                }
            </style>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        </head>
        <body>
            <div class="print-container">
                <div class="report-header">
                    <h1><i class="fas fa-file-medical"></i> Medical Document Analysis Report</h1>
                    <div class="report-meta">
                        ${data.filename ? `<span><i class="fas fa-file"></i> Document: ${data.filename}</span>` : ''}
                        ${data.text_length ? `<span><i class="fas fa-ruler"></i> Text length: ${data.text_length} chars</span>` : ''}
                        ${data.file_size ? `<span><i class="fas fa-weight"></i> File size: ${formatFileSize(data.file_size)}</span>` : ''}
                        <span><i class="fas fa-calendar"></i> Analyzed: ${timestamp}</span>
                        <span><i class="fas fa-trash"></i> Auto-deleted: Yes</span>
                    </div>
                </div>
                
                <div class="analysis-section">
                    <h2><i class="fas fa-stethoscope"></i> AI Analysis Results</h2>
                    <div class="analysis-content">
                        <p>${formattedAnalysis}</p>
                    </div>
                </div>
                
                <div class="print-footer">
                    <p>Generated by Medical Document Assistant</p>
                    <p>${url}</p>
                    <p>Report generated on: ${timestamp}</p>
                    <p class="disclaimer">
                        <i class="fas fa-exclamation-triangle"></i> 
                        Disclaimer: This analysis is for informational purposes only and is not a substitute for professional medical advice. 
                        Always consult with a qualified healthcare provider for medical diagnosis and treatment.
                    </p>
                    <p><em>🔒 Privacy: File and all associated records were automatically deleted after analysis. No medical data is permanently stored.</em></p>
                </div>
                
                <div class="print-actions no-print">
                    <button onclick="window.print()" style="padding: 10px 20px; background: #007aff; color: white; border: none; border-radius: 6px; cursor: pointer; margin: 20px;">
                        <i class="fas fa-print"></i> Print Report
                    </button>
                    <button onclick="window.close()" style="padding: 10px 20px; background: #f5f5f7; color: #1d1d1f; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; margin: 20px;">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
            
            <script>
                // Auto-print when window loads
                window.onload = function() {
                    window.print();
                };
                
                // Close window after printing
                window.onafterprint = function() {
                    setTimeout(function() {
                        window.close();
                    }, 1000);
                };
            <\/script>
        </body>
        </html>
    `);
    
    printWindow.document.close();
}

// ========== TOAST FUNCTIONS ==========
function initToast() {
    const closeToastButton = document.getElementById('closeToastButton');
    if (closeToastButton) {
        closeToastButton.addEventListener('click', hideToast);
    }
}

function showToast(message, type = 'error') {
    const toast = document.getElementById('errorToast');
    const toastMessage = document.getElementById('toastMessage');
    
    if (!toast || !toastMessage) return;
    
    // Update message
    toastMessage.textContent = message;
    
    // Update icon based on type
    const icon = toast.querySelector('i');
    if (icon) {
        if (type === 'success') {
            icon.className = 'fas fa-check-circle';
            icon.style.color = '#34c759';
        } else {
            icon.className = 'fas fa-exclamation-circle';
            icon.style.color = '#ff3b30';
        }
    }
    
    // Show toast
    toast.classList.add('show');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        hideToast();
    }, 5000);
}

function hideToast() {
    const toast = document.getElementById('errorToast');
    if (toast) {
        toast.classList.remove('show');
    }
}

// ========== LOADING FUNCTIONS ==========
function showLoading() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }
}

function hideLoading() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
}

// ========== DEBUG FUNCTIONS ==========
function debugFileInput() {
    const fileInput = document.getElementById('fileInput');
    console.log('File input:', fileInput);
    console.log('Files:', fileInput.files);
    console.log('File count:', fileInput.files.length);
    if (fileInput.files.length > 0) {
        console.log('Selected file:', fileInput.files[0].name, fileInput.files[0].size);
    }
}

function debugElements() {
    console.log('Checking all required elements...');
    const elements = ['fileInput', 'uploadZone', 'chooseFileButton', 'uploadButton', 'fileInfo'];
    elements.forEach(id => {
        const el = document.getElementById(id);
        console.log(`${id}:`, el ? 'Found' : 'NOT FOUND');
    });
}