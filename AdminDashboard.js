import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Button, TextField,
  MenuItem, Dialog, DialogTitle, DialogContent,
  DialogActions, Select, FormControl, InputLabel,
  IconButton, Tooltip, Alert, CircularProgress,
  AppBar, Toolbar
} from '@mui/material';
import {
  Add as AddIcon,
  CheckCircle as CheckIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Dashboard as DashboardIcon,
  History as HistoryIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';

const colors = {
  primary: '#7C3AED',
  secondary: '#10B981',
  background: '#0F172A',
  surface: '#1E293B',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  border: '#334155'
};

// Course name mapping
const courseNames = {
  1: "Biofuel Production Technologies",
  2: "Animation and Multimedia Design",
  3: "Social Service",
  4: "Agronomy",
  5: "Communication Design",
  6: "Veterinary Nursing",
  7: "Informatics Engineering",
  8: "Equinculture",
  9: "Management",
  10: "Economics",
  11: "Tourism",
  12: "Nursing",
  13: "Chemistry",
  14: "Journalism and Communication",
  15: "Basic Education",
  16: "Nutrition",
  17: "Sociology"
};

// Helper function to get risk level from score
const getRiskLevelFromScore = (score, thresholds) => {
  if (!score && score !== 0) return 'Unknown';
  if (score < (thresholds?.low || 2.5)) return 'Low';
  if (score > (thresholds?.high || 5.0)) return 'High';
  return 'Medium';
};

// Get risk color for styling
const getRiskColor = (riskLevel) => {
  switch(riskLevel) {
    case 'High': return colors.error;
    case 'Medium': return colors.warning;
    case 'Low': return colors.success;
    default: return colors.textSecondary;
  }
};

let searchTimeout = null;

const AdminDashboard = () => {
  const [students, setStudents] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, completed: 0, high_priority: 0 });
  const [thresholds, setThresholds] = useState({ low: 2.5, high: 5.0 });
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
  const [message, setMessage] = useState('');
  const [editingIntervention, setEditingIntervention] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentPredictions, setStudentPredictions] = useState([]);
  
  // FILTER STATES
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  
  const [newIntervention, setNewIntervention] = useState({
    student_id: '', intervention_type: '', description: '', priority: 'medium'
  });
  const [editForm, setEditForm] = useState({ description: '', priority: '', status: '' });

  // Debounce search
  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(searchTimeout);
  }, [searchTerm]);

  useEffect(() => {
    loadAllData();
  }, []);

  // ============================================
  // FETCH REAL STUDENTS FROM DATABASE
  // ============================================
  
  const loadAllData = async () => {
    setLoading(true);
    try {
      // 1. Fetch students from backend
      console.log("📡 Fetching students from database...");
      const studentsRes = await fetch('http://localhost:8000/api/students');
      let studentsData = [];
      
      if (studentsRes.ok) {
        const studentsResult = await studentsRes.json();
        if (studentsResult.success && studentsResult.students) {
          studentsData = studentsResult.students;
          console.log(`✅ Loaded ${studentsData.length} students from database`);
        } else if (Array.isArray(studentsResult)) {
          studentsData = studentsResult;
          console.log(`✅ Loaded ${studentsData.length} students from database`);
        } else {
          console.log("⚠️ No students found, using empty array");
        }
      } else {
        console.log("⚠️ Students API not available, using empty array");
      }
      
      // Process students - map course numbers to names, calculate risk levels
      const studentsWithDetails = studentsData.map(student => {
            
      let courseName = student.course;
      if (typeof student.course === 'number' && courseNames[student.course]) {
        courseName = courseNames[student.course];
      } else if (typeof student.course === 'string') {
        courseName = student.course;
      }

      // ✅ FIX RISK SCORE (no forced 0)
      let riskScore = student.risk_score ?? student.riskScore;

      // convert string → number
      if (typeof riskScore === "string") {
        riskScore = parseFloat(riskScore);
      }

      // ✅ FIX: handle missing OR zero values
      if (riskScore === undefined || riskScore === null || isNaN(riskScore) || riskScore === 0) {
        riskScore =
          (student.attendance ? (student.attendance / 100) * 4 : 0) +
          (student.debtor ? 2 : 0) +
          (student.tuition_fees_up_to_date === 0 ? 2 : 0) +
          (student.scholarship_holder === 0 ? 1 : 0);
      }

      const riskLevel = getRiskLevelFromScore(riskScore, thresholds);

      // ✅ FIX NAME (no fallback to ID unless really missing)
      let studentName =
        student.name ||
        student.student_name ||
        student.full_name;

      if (!studentName) {
        studentName = `Student_${String(student._id || '').slice(-4)}`;
      }

      const studentId = student.student_id || student.id || student._id || '-';
            
      return {
        ...student,
        student_id: studentId,
        name: studentName,
        course: courseName,
        course_code: student.course,
        risk_score: riskScore,
        risk_level: riskLevel,
        risk_factors: student.risk_factors || generateRiskFactors(student)
      };
    });
      
      setStudents(studentsWithDetails);
      
      // 2. Fetch interventions
      console.log("📡 Fetching interventions...");
      const interventionsRes = await fetch('http://localhost:8000/api/interventions');
      if (interventionsRes.ok) {
        const interventionsData = await interventionsRes.json();
        if (interventionsData.success && interventionsData.interventions) {
          const fixedInterventions = interventionsData.interventions.map(i => {
          const matchedStudent = studentsWithDetails.find(
            s => String(s.student_id) === String(i.student_id)
          );

          return {
            ...i,
            student_name:
              i.student_name ||
              matchedStudent?.name ||
              '-'
          };
        });

        setInterventions(fixedInterventions);
          console.log(`✅ Loaded ${interventionsData.interventions.length} interventions`);
        }
      }
      
      // 3. Fetch stats
      const statsRes = await fetch('http://localhost:8000/api/interventions/stats/summary');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success && statsData.stats) {
          setStats(statsData.stats);
        }
      }
      
      // 4. Fetch thresholds
      const thresholdsRes = await fetch('http://localhost:8000/api/thresholds');
      if (thresholdsRes.ok) {
        const thresholdsData = await thresholdsRes.json();
        if (thresholdsData.success && thresholdsData.data) {
          setThresholds(thresholdsData.data);
          console.log("✅ Loaded thresholds:", thresholdsData.data);
        }
      }
      
    } catch (error) {
      console.error("❌ Error loading data:", error);
      setMessage('⚠️ Error connecting to server');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // Generate risk factors based on student data
  const generateRiskFactors = (student) => {
    const factors = [];
    const riskScore = student.risk_score || student.riskScore || 0;
    
    if (riskScore > 5) factors.push("High risk score");
    if (student.attendance === 0) factors.push("Poor attendance");
    if (student.debtor === 1) factors.push("Financial issues");
    if (student.scholarship_holder === 0) factors.push("No scholarship");
    if (student.tuition_fees_up_to_date === 0) factors.push("Tuition pending");
    if (factors.length === 0) factors.push("Good academic standing");
    return factors;
  };

  // Safe filter function
  const filteredStudents = useMemo(() => {
    if (!students || students.length === 0) return [];
    
    return students.filter(student => {
      if (!student) return false;
      
      if (riskFilter !== 'all' && student.risk_level !== riskFilter) return false;
      if (courseFilter !== 'all' && student.course !== courseFilter) return false;
      
      if (debouncedSearch && debouncedSearch.trim() !== '') {
        const searchLower = debouncedSearch.toLowerCase();
        const studentId = student.student_id || '';
        const studentName = student.name || '';
        
        const idMatch = String(studentId).toLowerCase().includes(searchLower);
        const nameMatch = String(studentName).toLowerCase().includes(searchLower);
        
        if (!idMatch && !nameMatch) return false;
      }
      
      return true;
    });
  }, [students, riskFilter, courseFilter, debouncedSearch]);

  const uniqueCourses = useMemo(() => {
    const courses = students.map(s => s.course).filter(Boolean);
    return [...new Set(courses)];
  }, [students]);

  // ============================================
  // INTERVENTION CRUD OPERATIONS
  // ============================================

  const handleCreate = async () => {
    // Validation
    if (!newIntervention.student_id) {
      setMessage('❌ Student ID is missing');
      return;
    }
    if (!newIntervention.intervention_type) {
      setMessage('❌ Please select an intervention type');
      return;
    }
    if (!newIntervention.description || newIntervention.description.trim() === '') {
      setMessage('❌ Please enter a description');
      return;
    }

    setLoading(true);
    setMessage('⏳ Creating intervention...');

    try {
      console.log("📤 Sending intervention data:", {
        student_id: newIntervention.student_id,
        intervention_type: newIntervention.intervention_type,
        description: newIntervention.description.trim(),
        priority: newIntervention.priority || 'medium'
      });

      const response = await fetch('http://localhost:8000/api/interventions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          student_id: newIntervention.student_id,
          intervention_type: newIntervention.intervention_type,
          description: newIntervention.description.trim(),
          priority: newIntervention.priority || 'medium'
        })
      });

      const result = await response.json();
      console.log("📥 Response:", result);

      if (response.ok && result.success) {
        setMessage('✅ Intervention created successfully!');
        
        // Refresh data
        await loadAllData();
        
        // Close dialog and reset form
        setOpenDialog(false);
        setNewIntervention({
          student_id: '',
          intervention_type: '',
          description: '',
          priority: 'medium'
        });
        
      } else {
        setMessage(`❌ ${result.message || 'Failed to create intervention'}`);
      }
      
    } catch (error) {
      console.error("❌ Create error:", error);
      setMessage('❌ Could not connect to server. Make sure backend is running on port 8000');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const handleComplete = async (id) => {
    try {
      const response = await fetch(`http://localhost:8000/api/interventions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });
      
      if (response.ok) {
        setMessage('✅ Marked as completed!');
        await loadAllData();
      } else {
        setMessage('❌ Error updating');
      }
    } catch (error) {
      setMessage('❌ Error updating');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleEditClick = (intervention) => {
    setEditingIntervention(intervention);
    setEditForm({
      description: intervention.description || '',
      priority: intervention.priority || 'medium',
      status: intervention.status || 'open'
    });
    setOpenEditDialog(true);
  };

  const handleEditSave = async () => {
    if (!editingIntervention) return;
    
    try {
      const response = await fetch(`http://localhost:8000/api/interventions/${editingIntervention._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editForm.description,
          priority: editForm.priority,
          status: editForm.status
        })
      });
      
      if (response.ok) {
        setMessage('✅ Intervention updated!');
        await loadAllData();
        setOpenEditDialog(false);
        setEditingIntervention(null);
      } else {
        setMessage('❌ Error updating');
      }
    } catch (error) {
      setMessage('❌ Error updating');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Delete intervention for ${name}?`)) {
      try {
        const response = await fetch(`http://localhost:8000/api/interventions/${id}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          setMessage('✅ Deleted!');
          await loadAllData();
        } else {
          setMessage('❌ Error deleting');
        }
      } catch (error) {
        setMessage('❌ Error deleting');
      }
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const forceRefresh = async () => {
    setMessage('🔄 Refreshing from database...');
    await loadAllData();
    setMessage(`✅ Refreshed! ${students.length} students, ${interventions.length} interventions`);
    setTimeout(() => setMessage(''), 2000);
  };

  const loadPredictionHistory = async (student) => {
    setSelectedStudent(student);
    setOpenHistoryDialog(true);
    
    try {
      const response = await fetch(`http://localhost:8000/api/predictions/student/${student.student_id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.predictions) {
          setStudentPredictions(data.predictions);
        } else {
          setStudentPredictions([
            { 
              _id: "1", 
              created_at: new Date().toISOString(), 
              risk_score: student.risk_score || 0, 
              risk_level: student.risk_level, 
              confidence: 0.85, 
              prediction: student.risk_level === "High" ? "Dropout" : "Enrolled" 
            }
          ]);
        }
      }
    } catch (error) {
      console.error("Error loading predictions:", error);
      setStudentPredictions([]);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  // Helper functions
  const getFactorColor = (factor) => {
    if (!factor) return { color: colors.textSecondary, bg: 'rgba(148,163,184,0.15)' };
    const f = String(factor).toLowerCase();
    if (f.includes('financial')) return { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' };
    if (f.includes('attendance') || f.includes('absent')) return { color: '#EF4444', bg: 'rgba(239,68,68,0.15)' };
    if (f.includes('academic') || f.includes('grade')) return { color: '#EC489A', bg: 'rgba(236,72,153,0.15)' };
    if (f.includes('scholarship')) return { color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)' };
    if (f.includes('time') || f.includes('work')) return { color: '#14B8A6', bg: 'rgba(20,184,166,0.15)' };
    if (f.includes('good') || f.includes('standing')) return { color: '#10B981', bg: 'rgba(16,185,129,0.15)' };
    return { color: colors.textSecondary, bg: 'rgba(148,163,184,0.15)' };
  };

  const getStatusColor = (s) => {
    if (!s) return colors.warning;
    if (s === 'open') return colors.error;
    if (s === 'completed') return colors.success;
    return colors.warning;
  };
  
  const getPriorityColor = (p) => {
    if (!p) return colors.warning;
    if (p === 'high') return colors.error;
    if (p === 'medium') return colors.warning;
    return colors.success;
  };
  
  const getTypeIcon = (t) => {
    if (!t) return '📋';
    if (t === 'counseling') return '📋';
    if (t === 'financial_aid') return '💰';
    if (t === 'tutoring') return '📚';
    return '👥';
  };

  if (loading && students.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: colors.background }}>
        <CircularProgress sx={{ color: colors.primary }} />
        <Typography sx={{ ml: 2, color: colors.text }}>Loading students from database...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: colors.background, minHeight: '100vh' }}>
      <AppBar position="sticky" sx={{ bgcolor: colors.surface, borderBottom: `1px solid ${colors.border}` }}>
        <Toolbar>
          <DashboardIcon sx={{ color: colors.primary, mr: 2 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, color: colors.text, fontWeight: 'bold' }}>
            Admin Dashboard - Student Interventions
          </Typography>
          <Button onClick={handleLogout} sx={{ color: colors.textSecondary }}>Logout</Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: colors.text, mb: 3 }}>
          📊 Student Interventions
        </Typography>

        {message && (
          <Alert severity={message.includes('✅') ? 'success' : message.includes('🔄') ? 'info' : 'error'} sx={{ mb: 2 }} onClose={() => setMessage('')}>
            {message}
          </Alert>
        )}

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[
            { label: "Total Students", value: filteredStudents.length, color: colors.primary },
            { label: "Interventions", value: stats.total, color: colors.secondary },
            { label: "Open", value: stats.open, color: colors.error },
            { label: "Completed", value: stats.completed, color: colors.success },
          ].map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card
                elevation={0}
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  bgcolor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 2,
                }}
              >
                <CardContent
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    textAlign: "center",
                    py: 4,           
                    px: 3,           
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ color: colors.textSecondary, mb: 1, fontSize: "1.05rem" }}
                  >
                    {stat.label}
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: "bold",
                      color: stat.color,
                      lineHeight: 1.1,
                      minWidth: "80px",        
                    }}
                  >
                    {stat.value ?? 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Search and Filters */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: colors.surface }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search Student"
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type student ID or name..."
                InputProps={{ style: { color: colors.text } }}
                InputLabelProps={{ style: { color: colors.textSecondary } }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: colors.border } } }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                fullWidth
                label="Risk Level"
                size="small"
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                InputProps={{ style: { color: colors.text } }}
                InputLabelProps={{ style: { color: colors.textSecondary } }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: colors.border } } }}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="High">High Risk</MenuItem>
                <MenuItem value="Medium">Medium Risk</MenuItem>
                <MenuItem value="Low">Low Risk</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                fullWidth
                label="Course"
                size="small"
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                InputProps={{ style: { color: colors.text } }}
                InputLabelProps={{ style: { color: colors.textSecondary } }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: colors.border } } }}
              >
                <MenuItem value="all">All Courses</MenuItem>
                {uniqueCourses.map(course => (
                  <MenuItem key={course} value={course}>{course}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button fullWidth variant="outlined" onClick={forceRefresh} sx={{ borderColor: colors.primary, color: colors.primary }}>
                Refresh
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)} sx={{ bgcolor: colors.primary }}>
            New Intervention
          </Button>
        </Box>

        {/* Students Table - REAL DATA FROM DATABASE with proper display */}
        <Typography variant="h5" sx={{ color: colors.text, mb: 2 }}>
          Students ({filteredStudents.length} of {students.length})
        </Typography>
        
        <TableContainer component={Paper} sx={{ bgcolor: colors.surface, mb: 4, maxHeight: 500, overflow: 'auto' }}>
          <Table sx={{ minWidth: 800 }}>
            <TableHead sx={{ bgcolor: 'rgba(124,58,237,0.1)' }}>
              <TableRow>
                <TableCell sx={{ color: colors.text, fontWeight: 'bold' }}>Student ID</TableCell>
                <TableCell sx={{ color: colors.text, fontWeight: 'bold' }}>Course</TableCell>
                <TableCell sx={{ color: colors.text, fontWeight: 'bold' }}>Risk Score</TableCell>
                <TableCell sx={{ color: colors.text, fontWeight: 'bold' }}>Risk Level</TableCell>
                <TableCell sx={{ color: colors.text, fontWeight: 'bold' }}>Risk Factors</TableCell>
                <TableCell sx={{ color: colors.text, fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography sx={{ py: 4, color: colors.textSecondary }}>
                      {students.length === 0 ? "No students found in database" : "No students match your filters"}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((s, idx) => {
                  const riskLevel = s.risk_level;
                  const riskColor = getRiskColor(riskLevel);
                  
                  return (
                    <TableRow key={s._id || s.id || idx} hover>
                      <TableCell sx={{ color: colors.text }}>{s.student_id || '-'}</TableCell>
                      <TableCell sx={{ color: colors.text }}>{s.course || '-'}</TableCell>
                      <TableCell sx={{ color: colors.text }}>
                        <strong>
                          {typeof s.risk_score === "number"
                            ? s.risk_score.toFixed(2)
                            : "N/A"}
                        </strong>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={riskLevel} 
                          sx={{ 
                            bgcolor: riskColor, 
                            color: 'white',
                            fontWeight: 'bold',
                            minWidth: '70px'
                          }} 
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {(s.risk_factors || []).slice(0, 2).map((f, i) => {
                            const { color, bg } = getFactorColor(f);
                            return <Chip key={i} label={f} size="small" sx={{ bgcolor: bg, color: color, border: `1px solid ${color}` }} />;
                          })}
                          {(s.risk_factors || []).length > 2 && (
                            <Chip label={`+${s.risk_factors.length - 2} more`} size="small" variant="outlined" sx={{ color: colors.textSecondary }} />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="small" 
                          variant="outlined" 
                          onClick={() => { 
                          setNewIntervention({ 
                            student_id: s.student_id || '',
                            intervention_type: '',
                            description: '',
                            priority: 'medium'
                          }); 
                          setOpenDialog(true); 
                        }} 
                          sx={{ borderColor: colors.primary, color: colors.primary, mr: 1 }}
                        >
                          Add Intervention
                        </Button>
                        <IconButton size="small" onClick={() => loadPredictionHistory(s)}>
                          <HistoryIcon sx={{ color: colors.textSecondary }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Interventions Table */}
        <Typography variant="h5" sx={{ color: colors.text, mb: 2 }}>
          Recent Interventions ({interventions.length} total)
        </Typography>

        <TableContainer component={Paper} sx={{ bgcolor: colors.surface, overflowX: 'auto' }}>
          <Table sx={{ minWidth: 800 }}>
            <TableHead sx={{ bgcolor: 'rgba(124,58,237,0.1)' }}>
              <TableRow>
                <TableCell sx={{ color: colors.text, fontWeight: 'bold' }}>Student ID</TableCell>
                <TableCell sx={{ color: colors.text, fontWeight: 'bold' }}>Type</TableCell>
                <TableCell sx={{ color: colors.text, fontWeight: 'bold' }}>Priority</TableCell>
                <TableCell sx={{ color: colors.text, fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ color: colors.text, fontWeight: 'bold' }}>Description</TableCell>
                <TableCell sx={{ color: colors.text, fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {interventions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography sx={{ py: 4, color: colors.textSecondary }}>
                      No interventions yet. Click "New Intervention" to create one.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                interventions.slice().reverse().map(i => (
                  <TableRow key={i._id}>
                    <TableCell sx={{ color: colors.text }}>{i.student_id || '-'}</TableCell>
                    <TableCell sx={{ color: colors.text }}>{getTypeIcon(i.intervention_type)} {i.intervention_type || 'Unknown'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={String(i.priority || 'medium').toUpperCase()} 
                        size="small"
                        sx={{ bgcolor: getPriorityColor(i.priority), color: 'white', fontWeight: 'bold' }} 
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={String(i.status || 'open').toUpperCase()} 
                        size="small"
                        sx={{ bgcolor: getStatusColor(i.status), color: 'white', fontWeight: 'bold' }} 
                      />
                    </TableCell>
                    <TableCell sx={{ color: colors.text, maxWidth: 300 }}>
                      {i.description?.length > 60 ? i.description.substring(0, 60) + '...' : i.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Mark Complete">
                        <IconButton 
                          size="small" 
                          onClick={() => handleComplete(i._id)} 
                          disabled={i.status === 'completed'}
                        >
                          <CheckIcon sx={{ color: i.status === 'completed' ? colors.textSecondary : colors.success }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Intervention">
                        <IconButton size="small" onClick={() => handleEditClick(i)}>
                          <EditIcon sx={{ color: colors.warning }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Intervention">
                        <IconButton size="small" onClick={() => handleDelete(i._id, i.student_id)}>
                          <DeleteIcon sx={{ color: colors.error }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Create Intervention Dialog */}
        {/* Create Intervention Dialog - FIXED */}
        <Dialog 
          open={openDialog} 
          onClose={() => {
            setOpenDialog(false);
            // Reset form when closing
            setNewIntervention({
              student_id: '', 
              intervention_type: '', 
              description: '', 
              priority: 'medium'
            });
          }} 
          PaperProps={{ sx: { bgcolor: colors.surface, color: colors.text } }}
        >
          <DialogTitle sx={{ bgcolor: colors.primary, color: 'white' }}>
            Create New Intervention
          </DialogTitle>
          
          <DialogContent sx={{ pt: 3 }}>
            <TextField 
              fullWidth 
              label="Student ID" 
              margin="normal" 
              value={newIntervention.student_id} 
              disabled 
              InputProps={{ style: { color: colors.text } }} 
              InputLabelProps={{ style: { color: colors.textSecondary } }} 
            />

            <FormControl fullWidth margin="normal">
              <InputLabel sx={{ color: colors.textSecondary }}>Intervention Type *</InputLabel>
              <Select 
                value={newIntervention.intervention_type} 
                onChange={(e) => setNewIntervention({ 
                  ...newIntervention, 
                  intervention_type: e.target.value 
                })} 
                sx={{ color: colors.text }}
              >
                <MenuItem value="counseling">📋 Counseling</MenuItem>
                <MenuItem value="financial_aid">💰 Financial Aid</MenuItem>
                <MenuItem value="tutoring">📚 Tutoring</MenuItem>
                <MenuItem value="advisor_meeting">👥 Advisor Meeting</MenuItem>
              </Select>
            </FormControl>

            <TextField 
              fullWidth 
              label="Description *" 
              multiline 
              rows={4} 
              margin="normal" 
              value={newIntervention.description} 
              onChange={(e) => setNewIntervention({ 
                ...newIntervention, 
                description: e.target.value 
              })} 
              InputProps={{ style: { color: colors.text } }} 
              InputLabelProps={{ style: { color: colors.textSecondary } }} 
              placeholder="Describe the intervention and reason..."
            />

            <FormControl fullWidth margin="normal">
              <InputLabel sx={{ color: colors.textSecondary }}>Priority</InputLabel>
              <Select 
                value={newIntervention.priority} 
                onChange={(e) => setNewIntervention({ 
                  ...newIntervention, 
                  priority: e.target.value 
                })} 
                sx={{ color: colors.text }}
              >
                <MenuItem value="high">🔴 High - Urgent</MenuItem>
                <MenuItem value="medium">🟡 Medium - Important</MenuItem>
                <MenuItem value="low">🟢 Low - Monitor</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button 
              onClick={() => setOpenDialog(false)} 
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={handleCreate} 
              disabled={
                loading || 
                !newIntervention.student_id || 
                !newIntervention.intervention_type || 
                !newIntervention.description?.trim()
              }
              sx={{ bgcolor: colors.primary }}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {loading ? 'Creating...' : 'Create Intervention'}
            </Button>
          </DialogActions>
        </Dialog>
        {/* Edit Intervention Dialog */}
        <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} PaperProps={{ sx: { bgcolor: colors.surface } }}>
          <DialogTitle sx={{ bgcolor: colors.warning, color: colors.text }}>Edit Intervention</DialogTitle>
          <DialogContent>
            <FormControl fullWidth margin="normal">
              <InputLabel sx={{ color: colors.textSecondary }}>Status</InputLabel>
              <Select 
                value={editForm.status} 
                onChange={e => setEditForm({ ...editForm, status: e.target.value })} 
                sx={{ color: colors.text }}
              >
                <MenuItem value="open">🔴 Open</MenuItem>
                <MenuItem value="in_progress">🟡 In Progress</MenuItem>
                <MenuItem value="completed">🟢 Completed</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel sx={{ color: colors.textSecondary }}>Priority</InputLabel>
              <Select 
                value={editForm.priority} 
                onChange={e => setEditForm({ ...editForm, priority: e.target.value })} 
                sx={{ color: colors.text }}
              >
                <MenuItem value="high">🔴 High</MenuItem>
                <MenuItem value="medium">🟡 Medium</MenuItem>
                <MenuItem value="low">🟢 Low</MenuItem>
              </Select>
            </FormControl>
            <TextField 
              fullWidth 
              label="Description" 
              multiline 
              rows={3} 
              margin="normal" 
              value={editForm.description} 
              onChange={e => setEditForm({ ...editForm, description: e.target.value })} 
              InputProps={{ style: { color: colors.text } }} 
              InputLabelProps={{ style: { color: colors.textSecondary } }} 
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleEditSave} sx={{ bgcolor: colors.warning, color: colors.text }}>Save Changes</Button>
          </DialogActions>
        </Dialog>

        {/* History Dialog */}
        <Dialog open={openHistoryDialog} onClose={() => setOpenHistoryDialog(false)} PaperProps={{ sx: { bgcolor: colors.surface } }}>
          <DialogTitle sx={{ bgcolor: colors.primary, color: 'white' }}>Prediction History - {selectedStudent?.name}</DialogTitle>
          <DialogContent>
            {studentPredictions.length === 0 ? (
              <Typography sx={{ py: 4, textAlign: 'center', color: colors.textSecondary }}>
                No prediction history found
              </Typography>
            ) : (
              studentPredictions.map(p => (
                <Paper key={p._id} sx={{ p: 2, mb: 2, bgcolor: colors.background }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                      {new Date(p.created_at).toLocaleDateString()}
                    </Typography>
                    <Chip 
                      label={p.risk_level || getRiskLevelFromScore(p.risk_score, thresholds)} 
                      size="small" 
                      sx={{ bgcolor: getRiskColor(p.risk_level || getRiskLevelFromScore(p.risk_score, thresholds)), color: 'white', fontWeight: 'bold' }} 
                    />
                  </Box>
                  <Typography sx={{ color: colors.text }}><strong>Risk Score:</strong> {p.risk_score?.toFixed(2) || 'N/A'}</Typography>
                  <Typography sx={{ color: colors.text }}><strong>Confidence:</strong> {((p.confidence || 0.85) * 100).toFixed(0)}%</Typography>
                  <Typography sx={{ color: colors.text }}><strong>Prediction:</strong> {p.prediction || (p.risk_level === 'High' ? 'Dropout' : 'Enrolled')}</Typography>
                </Paper>
              ))
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenHistoryDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default AdminDashboard;