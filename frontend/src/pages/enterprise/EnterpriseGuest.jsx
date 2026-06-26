import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import { BookOpen, Download, GraduationCap, Bell, ShieldAlert } from 'lucide-react';
import api from '../../utils/api';

const GRADE_POINTS = { A: 4.0, B: 3.0, C: 2.0, D: 1.0, F: 0.0 };
const REMARK = grade => (grade === 'F' ? 'Fail' : 'Pass');

const computeGPA = courses => {
  const parsed = Array.isArray(courses) ? courses : JSON.parse(courses || '[]');
  if (!parsed.length) return '0.00';
  const totalCredits = parsed.reduce((acc, c) => acc + c.credits, 0);
  const weightedSum = parsed.reduce((acc, c) => acc + (GRADE_POINTS[c.grade] || 0) * c.credits, 0);
  return (weightedSum / totalCredits).toFixed(2);
};

const NOTICES = [
  { id: 1, text: 'Second semester examinations begin 14 July 2026 — Check your timetable.', icon: Bell },
  { id: 2, text: 'Results for CSCI301 have been released. Log in to view your grade.', icon: BookOpen },
  { id: 3, text: 'Scholarship application deadline: 30 June 2026. Visit the bursary office.', icon: GraduationCap },
];

const EnterpriseGuest = () => {
  const { user } = useAuth();
  const [transcript, setTranscript] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const fetchTranscript = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/enterprise/my-transcript');
      setTranscript(res.data);
    } catch (err) {
      console.error('Failed to load transcript:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTranscript(); }, [fetchTranscript]);

  const courses = transcript
    ? (Array.isArray(transcript.courses) ? transcript.courses : JSON.parse(transcript.courses || '[]'))
    : [];

  const gpa = transcript ? computeGPA(transcript.courses) : '0.00';

  return (
    <Layout title="Student Self-Service Portal">
      {showDownloadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-null-bg/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-null-surface border border-null-border rounded p-6 text-center">
            <Download className="w-8 h-8 text-null-muted mx-auto mb-3" />
            <h3 className="font-sans text-sm font-semibold text-null-text mb-2">Transcript Download</h3>
            <p className="font-sans text-xs text-null-muted mb-4 leading-relaxed">
              Transcript download request logged. Please visit the Registrar's office to collect a certified copy.
            </p>
            <button
              onClick={() => setShowDownloadModal(false)}
              className="px-4 py-2 bg-null-signal text-null-bg rounded text-xs font-mono hover:bg-null-signal/90 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6">

        {/* Welcome panel */}
        <div className="bg-null-surface border border-null-border rounded p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-sans text-base font-semibold text-null-text">
                Welcome, {user?.full_name} — Student Self-Service Portal
              </h2>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                {transcript && (
                  <>
                    <span className="font-mono text-xs text-null-muted">ID: <span className="text-null-text">{transcript.student_id}</span></span>
                    <span className="font-mono text-xs text-null-muted">Programme: <span className="text-null-text">{transcript.programme}</span></span>
                    <span className="font-mono text-xs text-null-muted">Year: <span className="text-null-text">{transcript.academic_year}</span></span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-mono bg-null-border/20 text-null-muted border-null-border">
              <GraduationCap className="w-3.5 h-3.5" />
              STUDENT
            </div>
          </div>
          <div className="mt-3 p-3 bg-null-info/5 border border-null-info/20 rounded">
            <p className="font-sans text-xs text-null-info">
              You are accessing the Nexus Academy system through a verified Zero Trust session.
              You may only view your own academic record.
            </p>
          </div>
        </div>

        {/* Transcript Card */}
        <div className="bg-null-surface border border-null-border rounded p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-null-border">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-null-signal" />
              <h3 className="font-sans text-sm font-semibold text-null-text">My Academic Transcript</h3>
            </div>
            <button
              id="download-transcript-btn"
              onClick={() => setShowDownloadModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-null-surface border border-null-border rounded text-null-muted hover:border-null-signal/40 hover:text-null-signal transition-colors"
            >
              <Download className="w-3 h-3" /> Download Transcript (PDF)
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 font-mono text-xs text-null-muted animate-pulse">LOADING ACADEMIC RECORD...</div>
          ) : !transcript ? (
            <div className="text-center py-12 font-sans text-xs text-null-muted">No transcript found for your account.</div>
          ) : (
            <>
              {/* Student identity */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                {[
                  { label: 'Student Name', value: transcript.student_name },
                  { label: 'Student ID', value: transcript.student_id },
                  { label: 'Programme', value: transcript.programme },
                  { label: 'Academic Year', value: transcript.academic_year },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-null-bg border border-null-border rounded p-3">
                    <div className="font-mono text-[10px] text-null-muted uppercase tracking-wider mb-1">{label}</div>
                    <div className="font-sans text-sm font-medium text-null-text">{value}</div>
                  </div>
                ))}
              </div>

              {/* Courses table */}
              <div className="overflow-x-auto border border-null-border rounded bg-null-bg mb-4">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-null-surface-raised text-[10px] font-mono uppercase tracking-wider text-null-muted border-b border-null-border">
                      <th className="py-3 px-4">Course Code</th>
                      <th className="py-3 px-4">Course Name</th>
                      <th className="py-3 px-4 text-center">Credits</th>
                      <th className="py-3 px-4 text-center">Grade</th>
                      <th className="py-3 px-4 text-center">Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-null-border font-sans text-sm text-null-text">
                    {courses.map(c => (
                      <tr key={c.code} className="hover:bg-null-surface/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs text-null-muted">{c.code}</td>
                        <td className="py-3 px-4">{c.name}</td>
                        <td className="py-3 px-4 text-center font-mono text-xs">{c.credits}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`font-mono text-sm font-bold ${c.grade === 'A' ? 'text-null-signal' : c.grade === 'F' ? 'text-null-deny' : 'text-null-text'}`}>
                            {c.grade}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`font-mono text-xs ${c.grade === 'F' ? 'text-null-deny' : 'text-null-signal'}`}>
                            {REMARK(c.grade)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* GPA */}
              <div className="flex items-center justify-end gap-4 p-4 bg-null-bg border border-null-border rounded">
                <span className="font-sans text-sm text-null-muted">Cumulative GPA</span>
                <span className={`font-mono text-2xl font-bold ${parseFloat(gpa) >= 3.5 ? 'text-null-signal' : parseFloat(gpa) >= 2.0 ? 'text-null-warn' : 'text-null-deny'}`}>
                  {gpa} / 4.00
                </span>
              </div>
            </>
          )}
        </div>

        {/* Notices board */}
        <div className="bg-null-surface border border-null-border rounded p-5">
          <h3 className="font-sans text-sm font-semibold text-null-text mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-null-warn" /> Academic Notices Board
          </h3>
          <div className="flex flex-col gap-3">
            {NOTICES.map(n => {
              const Icon = n.icon;
              return (
                <div key={n.id} className="flex items-start gap-3 p-3 bg-null-bg border border-null-border rounded">
                  <Icon className="w-4 h-4 text-null-muted flex-shrink-0 mt-0.5" />
                  <p className="font-sans text-xs text-null-text leading-relaxed">{n.text}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Restriction notice — permanent amber bar */}
        <div className="flex items-start gap-3 p-4 bg-null-warn/5 border border-null-warn/20 rounded">
          <ShieldAlert className="w-4 h-4 text-null-warn flex-shrink-0 mt-0.5" />
          <p className="font-sans text-xs text-null-warn leading-relaxed">
            Your role (Student) permits read-only access to your own academic record.
            Any attempt to access staff or administrative resources has been logged and will be reviewed.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default EnterpriseGuest;
