import React, { useState, useRef, useCallback } from 'react';
import {
  Upload,
  FileText,
  Filter,
  Download,
  Search,
  Eye,
  CheckSquare,
  Square,
  Folder,
  MessageSquare,
  Users,
  BarChart3,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

const EdDiscussionExtractor = () => {
  const [step, setStep] = useState(1);
  const [jsonData, setJsonData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedPostTypes, setSelectedPostTypes] = useState({
    question: true,
    question_comment: true,
    answer: true,
    answer_comment: true
  });
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [selectedSubcategories, setSelectedSubcategories] = useState(new Set());
  const [exportFormat, setExportFormat] = useState('html');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [stats, setStats] = useState(null);

  const fileInputRef = useRef(null);

  const postTypeLabels = {
    question: 'Questions',
    question_comment: 'Question Comments',
    answer: 'Answers',
    answer_comment: 'Answer Comments'
  };

  const processJsonData = useCallback((data) => {
    let discussions = Array.isArray(data) ? data : [data];
    const cats = new Set();
    const subcats = new Set();
    const catToSubcat = {};

    discussions.forEach(discussion => {
      const cat = discussion.category?.trim() || '';
      const subcat = discussion.subcategory?.trim() || '';

      if (cat) {
        cats.add(cat);
        if (!catToSubcat[cat]) catToSubcat[cat] = new Set();
      }
      if (subcat) {
        subcats.add(subcat);
        if (cat) catToSubcat[cat].add(subcat);
      }
    });

    const sortedCats = Array.from(cats).sort();
    const sortedSubcats = Array.from(subcats).sort();

    setCategories(sortedCats);
    setSubcategories(sortedSubcats);
    setSelectedCategories(new Set(sortedCats));
    setSelectedSubcategories(new Set(sortedSubcats));
    setExpandedCategories(new Set(sortedCats));

    const statsData = {
      totalDiscussions: discussions.length,
      totalQuestions: discussions.filter(d => d.text?.trim()).length,
      totalAnswers: discussions.reduce((acc, d) => acc + (d.answers?.length || 0), 0),
      totalComments: discussions.reduce((acc, d) => {
        const qComments = d.comments?.length || 0;
        const aComments = d.answers?.reduce((acc2, a) => acc2 + (a.comments?.length || 0), 0) || 0;
        return acc + qComments + aComments;
      }, 0),
      categoriesCount: sortedCats.length
    };
    setStats(statsData);
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (file) => {
    if (!file.name.toLowerCase().endsWith('.json')) {
      alert('Please select a JSON file');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        setJsonData(data);
        processJsonData(data);
        setStep(2);
      } catch (error) {
        alert('Invalid JSON file. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  const togglePostType = (type) => {
    setSelectedPostTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const toggleCategory = (category) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(category)) {
      newSelected.delete(category);
      subcategories.forEach(sub => {
        const categorySubcats = jsonData
          .filter(d => d.category === category)
          .map(d => d.subcategory)
          .filter(Boolean);
        if (categorySubcats.includes(sub)) {
          setSelectedSubcategories(prev => {
            const newSub = new Set(prev);
            newSub.delete(sub);
            return newSub;
          });
        }
      });
    } else {
      newSelected.add(category);
    }
    setSelectedCategories(newSelected);
  };

  const toggleSubcategory = (subcategory) => {
    const newSelected = new Set(selectedSubcategories);
    if (newSelected.has(subcategory)) {
      newSelected.delete(subcategory);
    } else {
      newSelected.add(subcategory);
    }
    setSelectedSubcategories(newSelected);
  };

  const toggleCategoryExpansion = (category) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const selectAllPostTypes = () => {
    setSelectedPostTypes({
      question: true,
      question_comment: true,
      answer: true,
      answer_comment: true
    });
  };

  const deselectAllPostTypes = () => {
    setSelectedPostTypes({
      question: false,
      question_comment: false,
      answer: false,
      answer_comment: false
    });
  };

  const filterData = () => {
    if (!jsonData) return [];

    const discussions = Array.isArray(jsonData) ? jsonData : [jsonData];
    return discussions
      .filter(discussion => {
        const cat = discussion.category?.trim() || '';
        const subcat = discussion.subcategory?.trim() || '';

        const categoryMatch = !cat || selectedCategories.has(cat);
        const subcategoryMatch = !subcat || selectedSubcategories.has(subcat);

        return categoryMatch && subcategoryMatch;
      })
      .map(discussion => {
        const filtered = { ...discussion };

        if (!selectedPostTypes.question) {
          filtered.title = '';
          filtered.text = '';
        }
        if (!selectedPostTypes.question_comment) {
          filtered.comments = [];
        }
        if (!selectedPostTypes.answer) {
          filtered.answers = [];
        } else if (filtered.answers) {
          filtered.answers = filtered.answers.map(answer => ({
            ...answer,
            comments: selectedPostTypes.answer_comment ? answer.comments : []
          }));
        }

        return filtered;
      });
  };

  const generateOutput = () => {
    const filteredData = filterData();

    if (exportFormat === 'html') {
      generateHTML(filteredData);
    } else if (exportFormat === 'csv') {
      generateCSV(filteredData);
    } else if (exportFormat === 'txt') {
      generateTXT(filteredData);
    }
  };

  const generateHTML = (data) => {
    const jsonStr = JSON.stringify(data, null, 2);
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ed Discussion Archive</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .discussion { background: white; border-radius: 8px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .discussion-header { border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 16px; }
        .discussion-title { font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 4px; }
        .discussion-meta { color: #64748b; font-size: 14px; }
        .post { margin: 12px 0; padding: 12px; border-left: 3px solid #e2e8f0; background: #f8fafc; }
        .post-question { border-left-color: #3b82f6; }
        .post-answer { border-left-color: #10b981; }
        .post-comment { border-left-color: #f59e0b; margin-left: 20px; }
        .post-label { font-weight: 600; color: #374151; margin-bottom: 8px; }
        .search-box { width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 16px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Ed Discussion Archive</h1>
            <input type="text" class="search-box" placeholder="Search discussions..." onkeyup="searchDiscussions(this.value)">
        </div>
        <div id="discussions-container"></div>
    </div>
    <script>
        var discussions = ${jsonStr};
        function escapeHtml(text) {
            if (!text) return "";
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        function buildDiscussions(filteredDiscussions = discussions) {
            const container = document.getElementById("discussions-container");
            container.innerHTML = "";
            filteredDiscussions.forEach(discussion => {
                const discDiv = document.createElement("div");
                discDiv.className = "discussion";
                let html = "<div class='discussion-header'>";
                html += "<div class='discussion-title'>" + escapeHtml(discussion.title || 'Untitled Discussion') + "</div>";
                html += "<div class='discussion-meta'>Discussion #" + (discussion.number || 'N/A') + " • Category: " + escapeHtml(discussion.category || 'None');
                if (discussion.subcategory) {
                    html += " • " + escapeHtml(discussion.subcategory);
                }
                html += "</div></div>";
                if (discussion.text) {
                    html += "<div class='post post-question'><div class='post-label'>Question</div>" + escapeHtml(discussion.text) + "</div>";
                }
                if (discussion.comments && discussion.comments.length > 0) {
                    discussion.comments.forEach(comment => {
                        html += "<div class='post post-comment'><div class='post-label'>Question Comment</div>" + escapeHtml(comment.text) + "</div>";
                    });
                }
                if (discussion.answers && discussion.answers.length > 0) {
                    discussion.answers.forEach((answer, index) => {
                        html += "<div class='post post-answer'><div class='post-label'>Answer " + (index + 1) + "</div>" + escapeHtml(answer.text) + "</div>";
                        if (answer.comments && answer.comments.length > 0) {
                            answer.comments.forEach(comment => {
                                html += "<div class='post post-comment'><div class='post-label'>Answer Comment</div>" + escapeHtml(comment.text) + "</div>";
                            });
                        }
                    });
                }
                discDiv.innerHTML = html;
                container.appendChild(discDiv);
            });
        }
        function searchDiscussions(searchTerm) {
            if (!searchTerm.trim()) {
                buildDiscussions();
                return;
            }
            const filtered = discussions.filter(discussion => {
                const searchText = [
                    discussion.title,
                    discussion.text,
                    discussion.category,
                    discussion.subcategory,
                    ...(discussion.comments || []).map(c => c.text),
                    ...(discussion.answers || []).flatMap(a => [a.text, ...(a.comments || []).map(c => c.text)])
                ].join(' ').toLowerCase();
                return searchText.includes(searchTerm.toLowerCase());
            });
            buildDiscussions(filtered);
        }
        buildDiscussions();
    </script>
</body>
</html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ed-discussions-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateCSV = (data) => {
    const headers = ['Discussion Number', 'Category', 'Subcategory', 'Title', 'Text', 'Comments', 'Answers'];
    const rows = [headers];
    data.forEach(discussion => {
      rows.push([
        discussion.number || '',
        discussion.category || '',
        discussion.subcategory || '',
        discussion.title || '',
        discussion.text || '',
        JSON.stringify(discussion.comments || []),
        JSON.stringify(discussion.answers || [])
      ]);
    });
    const csvContent = rows
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ed-discussions-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateTXT = (data) => {
    let content = '';
    data.forEach(discussion => {
      content += `Discussion Number: ${discussion.number || ''}\n`;
      content += `Category: ${discussion.category || ''}\n`;
      content += `Subcategory: ${discussion.subcategory || ''}\n`;
      content += `Title: ${discussion.title || ''}\n`;
      content += `Text: ${discussion.text || ''}\n`;
      content += `Comments: ${JSON.stringify(discussion.comments || [])}\n`;
      content += `Answers: ${JSON.stringify(discussion.answers || [])}\n`;
      content += '\n---\n\n';
    });
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ed-discussions-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getFilteredStats = () => {
    const filtered = filterData();
    return {
      discussions: filtered.length,
      questions: filtered.filter(d => d.text?.trim()).length,
      answers: filtered.reduce((acc, d) => acc + (d.answers?.length || 0), 0),
      comments: filtered.reduce((acc, d) => {
        const qComments = d.comments?.length || 0;
        const aComments = d.answers?.reduce((acc2, a) => acc2 + (a.comments?.length || 0), 0) || 0;
        return acc + qComments + aComments;
      }, 0)
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Ed Discussion Extractor</h1>
          <p className="text-lg text-gray-600">Transform your Ed discussion data into readable, analyzable formats</p>
        </div>
        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>\
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>1</div>
              <span className="ml-2 font-medium">Upload</span>
            </div>
            <ChevronRight className={step >= 2 ? 'text-blue-600' : 'text-gray-400'} size={20} />
            <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>\
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>2</div>
              <span className="ml-2 font-medium">Configure</span>
            </div>
            <ChevronRight className={step >= 3 ? 'text-blue-600' : 'text-gray-400'} size={20} />
            <div className={`flex items-center ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>\
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>3</div>
              <span className="ml-2 font-medium">Export</span>
            </div>
          </div>
        </div>
        {/* Step 1: File Upload */}
        {step === 1 && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="text-center mb-6">
                <Upload className="mx-auto h-12 w-12 text-blue-600 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your JSON File</h2>
                <p className="text-gray-600">Select or drag and drop your Ed discussion JSON export file</p>
              </div>
              <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Drop your JSON file here, or{' '}
                  <button onClick={() => fileInputRef.current?.click()} className="text-blue-600 hover:text-blue-700 underline">browse</button>
                </p>
                <p className="text-sm text-gray-500">Supports .json files up to 10MB</p>
                <input ref={fileInputRef} type="file" accept=".json" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} className="hidden" />
              </div>
            </div>
          </div>
        )}
        {/* Step 2: Configuration */}
        {step === 2 && (
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Configure Your Export</h2>
                  <p className="text-gray-600">File: {fileName}</p>
                </div>
                <button onClick={() => setStep(3)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                  Continue to Export
                </button>
              </div>
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.totalDiscussions}</div>
                    <div className="text-sm text-gray-600">Discussions</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.totalQuestions}</div>
                    <div className="text-sm text-gray-600">Questions</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600">{stats.totalAnswers}</div>
                    <div className="text-sm text-gray-600">Answers</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-600">{stats.totalComments}</div>
                    <div className="text-sm text-gray-600">Comments</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-gray-600">{stats.categoriesCount}</div>
                    <div className="text-sm text-gray-600">Categories</div>
                  </div>
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Post Types to Include</h3>
                    <div className="space-x-2">
                      <button onClick={selectAllPostTypes} className="text-sm text-blue-600 hover:text-blue-700">Select All</button>
                      <button onClick={deselectAllPostTypes} className="text-sm text-gray-600 hover:text-gray-700">Deselect All</button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(postTypeLabels).map(([key, label]) => (
                      <label key={key} className="flex items-center p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                        <div className="flex items-center">
                          {selectedPostTypes[key] ? (
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <span className="ml-3 font-medium text-gray-900">{label}</span>
                        <input type="checkbox" checked={selectedPostTypes[key]} onChange={() => togglePostType(key)} className="sr-only" />
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Categories & Subcategories</h3>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input type="text" placeholder="Search categories..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
                    {categories.filter(cat => cat.toLowerCase().includes(searchTerm.toLowerCase())).map(category => {
                      const categorySubcats = subcategories.filter(sub => {
                        const discussions = Array.isArray(jsonData) ? jsonData : [jsonData];
                        return discussions.some(d => d.category === category && d.subcategory === sub);
                      });
                      return (
                        <div key={category} className="border-b border-gray-200 last:border-b-0">
                          <div className="flex items-center p-3 hover:bg-gray-50">
                            <button onClick={() => toggleCategoryExpansion(category)} className="mr-2">
                              {expandedCategories.has(category) ? (
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                              )}
                            </button>
                            <button onClick={() => toggleCategory(category)} className="flex items-center flex-1">
                              {selectedCategories.has(category) ? (
                                <CheckSquare className="h-5 w-5 text-blue-600 mr-3" />
                              ) : (
                                <Square className="h-5 w-5 text-gray-400 mr-3" />
                              )}
                              <Folder className="h-4 w-4 text-gray-400 mr-2" />
                              <span className="font-medium text-gray-900">{category}</span>
                            </button>
                          </div>
                          {expandedCategories.has(category) && categorySubcats.map(subcategory => (
                            <div key={subcategory} className="flex items-center p-3 pl-12 hover:bg-gray-50">
                              <button onClick={() => toggleSubcategory(subcategory)} className="flex items-center flex-1">
                                {selectedSubcategories.has(subcategory) ? (
                                  <CheckSquare className="h-5 w-5 text-blue-600 mr-3" />
                                ) : (
                                  <Square className="h-5 w-5 text-gray-400 mr-3" />
                                )}
                                <span className="text-gray-700">{subcategory}</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Step 3: Export */}
        {step === 3 && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="text-center mb-8">
                <Download className="mx-auto h-12 w-12 text-blue-600 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Export Your Data</h2>
                <p className="text-gray-600">Choose your preferred format and generate the export</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Preview</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(() => {
                    const filteredStats = getFilteredStats();
                    return (
                      <>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{filteredStats.discussions}</div>
                          <div className="text-sm text-gray-600">Discussions</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{filteredStats.questions}</div>
                          <div className="text-sm text-gray-600">Questions</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">{filteredStats.answers}</div>
                          <div className="text-sm text-gray-600">Answers</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-600">{filteredStats.comments}</div>
                          <div className="text-sm text-gray-600">Comments</div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Format</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <label className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${exportFormat === 'html' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="format" value="html" checked={exportFormat === 'html'} onChange={(e) => setExportFormat(e.target.value)} className="sr-only" />
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900 mb-2">HTML</div>
                      <div className="text-sm text-gray-600">Interactive web page with search functionality</div>
                    </div>
                  </label>
                  <label className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${exportFormat === 'csv' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="format" value="csv" checked={exportFormat === 'csv'} onChange={(e) => setExportFormat(e.target.value)} className="sr-only" />
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900 mb-2">CSV</div>
                      <div className="text-sm text-gray-600">Spreadsheet format for data analysis</div>
                    </div>
                  </label>
                  <label className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${exportFormat === 'txt' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="format" value="txt" checked={exportFormat === 'txt'} onChange={(e) => setExportFormat(e.target.value)} className="sr-only" />
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900 mb-2">Text</div>
                      <div className="text-sm text-gray-600">Plain text format for simple viewing</div>
                    </div>
                  </label>
                </div>
              </div>
              <div className="text-center">
                <button onClick={generateOutput} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium text-lg transition-colors inline-flex items-center">
                  <Download className="mr-2 h-5 w-5" />
                  Generate {exportFormat.toUpperCase()} Export
                </button>
              </div>
              <div className="text-center mt-4">
                <button onClick={() => setStep(2)} className="text-gray-600 hover:text-gray-700 font-medium">
                  ← Back to Configuration
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EdDiscussionExtractor;
