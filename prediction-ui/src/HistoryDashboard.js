import React, { useState, useEffect } from 'react';
import './HistoryDashboard.css';

const API_BASE_URL = 'http://localhost:8000';

const HistoryDashboard = () => {
  const [studentId, setStudentId] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [studentInfo, setStudentInfo] = useState(null);
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // ESC key to close modal
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape' && selectedPrediction) {
        setSelectedPrediction(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [selectedPrediction]);

  const showNotification = (message, type = 'error') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  const loadHistory = async () => {
    const trimmedId = studentId.trim();
    
    if (!trimmedId) {
      showNotification('Please enter a Student ID', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/predictions/${trimmedId}`);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      let preds = [];
      if (data.predictions) {
        preds = data.predictions;
      } else if (data.student_id) {
        preds = [data];
      } else if (Array.isArray(data)) {
        preds = data;
      } else {
        preds = [];
      }

      if (preds.length === 0) {
        showNotification(`No predictions found for Student ID: ${trimmedId}`, 'warning');
      } else {
        showNotification(`Found ${preds.length} prediction(s) for ${trimmedId}`, 'success');
      }

      setPredictions(preds);
      setStudentInfo({
        id: trimmedId,
        total: preds.length,
        latest: preds[0]?.risk_level || '-'
      });

    } catch (error) {
      console.error("API error:", error);
      showNotification('API error. Make sure backend is running on port 8000', 'error');
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    low: predictions.filter(p => p?.risk_level === "Graduate").length,
    medium: predictions.filter(p => p?.risk_level === "Enrolled").length,
    high: predictions.filter(p => p?.risk_level === "Dropout").length,
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'No date';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleString();
    } catch (e) {
      return 'Invalid date';
    }
  };

  const getProbability = (pred, riskType) => {
    const lowerRiskType = riskType.toLowerCase();
    
    if (pred && pred.risk_probabilities) {
      let prob = pred.risk_probabilities[lowerRiskType];
      if (prob !== undefined && prob !== null) {
        if (prob <= 1 && prob >= 0) {
          return prob * 100;
        }
        return prob;
      }
    }
    
    if (pred && pred.probabilities) {
      let prob = pred.probabilities[lowerRiskType];
      if (prob !== undefined && prob !== null) {
        if (prob <= 1 && prob >= 0) {
          return prob * 100;
        }
        return prob;
      }
    }
    
    return 0;
  };

  const getConfidence = (pred) => {
    if (!pred) return 'N/A';
    
    const probs = pred.risk_probabilities || pred.probabilities;
    
    if (probs) {
      const riskLevelLower = pred.risk_level?.toLowerCase() || '';
      let confidenceValue = probs[riskLevelLower];
      
      if (confidenceValue !== undefined && confidenceValue !== null) {
        if (confidenceValue <= 1 && confidenceValue >= 0) {
          return (confidenceValue * 100).toFixed(1);
        }
        return confidenceValue.toFixed(1);
      }
      
      const maxProb = Math.max(
        probs.dropout || 0,
        probs.enrolled || 0,
        probs.graduate || 0
      );
      
      if (maxProb <= 1 && maxProb >= 0) {
        return (maxProb * 100).toFixed(1);
      }
      return maxProb.toFixed(1);
    }
    
    return 'N/A';
  };

  return (
    <div className="dashboard-container">

      {/* Beautiful Notification */}
      {notification.show && (
        <div className={`notification notification-${notification.type}`}>
          <div className="notification-icon">
            {notification.type === 'success' && '✅'}
            {notification.type === 'error' && '❌'}
            {notification.type === 'warning' && '⚠️'}
            {notification.type === 'info' && 'ℹ️'}
          </div>
          <div className="notification-content">
            <div className="notification-title">
              {notification.type === 'success' && 'Success'}
              {notification.type === 'error' && 'Error'}
              {notification.type === 'warning' && 'Warning'}
              {notification.type === 'info' && 'Info'}
            </div>
            <div className="notification-message">{notification.message}</div>
          </div>
          <button 
            className="notification-close" 
            onClick={() => setNotification({ show: false, message: '', type: '' })}
          >
            ×
          </button>
        </div>
      )}

      <div className="dashboard-header">
        <h1>Prediction History Dashboard</h1>
        <p>View your past risk assessments</p>
      </div>

      <div className="card">
        <h3>🔍 Search Student History</h3>
        <div className="search-box">
          <input
            type="text"
            placeholder="e.g., STU001"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && loadHistory()}
          />
          <button onClick={loadHistory} disabled={loading}>
            {loading ? 'Loading...' : 'Load History'}
          </button>
        </div>
      </div>

      {studentInfo && (
        <div className="card">
          <h3>👤 Student Information</h3>
          <div className="info-grid">
            <div className="info-item"><b>Student ID:</b> {studentInfo.id}</div>
            <div className="info-item"><b>Total Predictions:</b> {studentInfo.total}</div>
            <div className="info-item">
              <b>Latest Risk:</b>
              <span className={`risk-badge risk-${studentInfo.latest}`} style={{marginLeft: 10}}>
                {studentInfo.latest}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="stats">
        <div className="stat-card">
          <h2>{stats.low}</h2>
          <p>Low Risk (Graduate)</p>
        </div>
        <div className="stat-card">
          <h2>{stats.medium}</h2>
          <p>Medium Risk (Enrolled)</p>
        </div>
        <div className="stat-card">
          <h2>{stats.high}</h2>
          <p>High Risk (Dropout)</p>
        </div>
      </div>

      <div className="table-container">
        <table className="history-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Risk Level</th>
              <th>Confidence</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4" className="no-data">Loading predictions...</td>
              </tr>
            ) : predictions.length === 0 ? (
              <tr>
                <td colSpan="4" className="no-data">
                  📭 No prediction history found for this student
                </td>
              </tr>
            ) : (
              predictions.map((p, i) => (
                <tr key={i}>
                  <td>{formatDate(p.created_at || p.timestamp)}</td>
                  <td>
                    <span className={`risk-badge risk-${p.risk_level}`}>
                      {p.risk_level}
                    </span>
                  </td>
                  <td>{getConfidence(p)}%</td>
                  <td>
                    <button 
                      className="view-btn" 
                      onClick={() => setSelectedPrediction(p)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedPrediction && (
        <div className="modal-overlay" onClick={() => setSelectedPrediction(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📈 Prediction Explanation</h3>
              <button className="modal-close" onClick={() => setSelectedPrediction(null)}>×</button>
            </div>

            <div className="modal-body">
              <div className="modal-info-card">
                <div className="modal-info-row">
                  <span className="modal-info-label">Student ID</span>
                  <span className="modal-info-value">{selectedPrediction.student_id || studentId}</span>
                </div>
                <div className="modal-info-row">
                  <span className="modal-info-label">Date & Time</span>
                  <span className="modal-info-value">
                    {formatDate(selectedPrediction.created_at || selectedPrediction.timestamp)}
                  </span>
                </div>
                <div className="modal-info-row">
                  <span className="modal-info-label">Risk Level</span>
                  <span>
                    <span className={`modal-risk-badge ${selectedPrediction.risk_level}`}>
                      {selectedPrediction.risk_level}
                    </span>
                  </span>
                </div>
                <div className="modal-info-row">
                  <span className="modal-info-label">Confidence</span>
                  <span className="confidence-badge">{getConfidence(selectedPrediction)}%</span>
                </div>
              </div>

              <div className="probability-title">Probability Breakdown</div>

              <div className="probability-item">
                <div className="probability-label">
                  <span className="label-name">🎓 Dropout</span>
                  <span className="label-value">{getProbability(selectedPrediction, 'Dropout').toFixed(1)}%</span>
                </div>
                <div className="probability-bar-container">
                  <div 
                    className="probability-fill fill-Dropout"
                    style={{width: `${getProbability(selectedPrediction, 'Dropout')}%`}}
                  ></div>
                </div>
              </div>

              <div className="probability-item">
                <div className="probability-label">
                  <span className="label-name">📚 Enrolled</span>
                  <span className="label-value">{getProbability(selectedPrediction, 'Enrolled').toFixed(1)}%</span>
                </div>
                <div className="probability-bar-container">
                  <div 
                    className="probability-fill fill-Enrolled"
                    style={{width: `${getProbability(selectedPrediction, 'Enrolled')}%`}}
                  ></div>
                </div>
              </div>

              <div className="probability-item">
                <div className="probability-label">
                  <span className="label-name">🎉 Graduate</span>
                  <span className="label-value">{getProbability(selectedPrediction, 'Graduate').toFixed(1)}%</span>
                </div>
                <div className="probability-bar-container">
                  <div 
                    className="probability-fill fill-Graduate"
                    style={{width: `${getProbability(selectedPrediction, 'Graduate')}%`}}
                  ></div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <span>🔍 Based on your academic performance and personal factors</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default HistoryDashboard;