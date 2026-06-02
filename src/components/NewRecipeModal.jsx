import React, { useState, useRef } from 'react'

export default function NewRecipeModal({ onClose, onSave }) {
  const [mode, setMode] = useState('text') // 'text' | 'photo'
  const [text, setText] = useState('')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)

  const hasApiKey = true // We attempt; server handles missing key gracefully

  async function handleSubmit() {
    setLoading(true)
    try {
      let result
      if (mode === 'photo' && files.length > 0) {
        const formData = new FormData()
        files.forEach(f => formData.append('images', f))
        const res = await fetch('/api/parse-recipes', {
          method: 'POST',
          body: formData,
        })
        result = await res.json()
      } else if (mode === 'text' && text.trim()) {
        const res = await fetch('/api/parse-recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })
        result = await res.json()
      } else {
        setLoading(false)
        return
      }

      if (result && result.recipes) {
        for (const recipe of result.recipes) {
          onSave(recipe)
        }
      }
      onClose()
    } catch (err) {
      console.error('Error parsing recipe:', err)
    }
    setLoading(false)
  }

  function handleFileChange(e) {
    setFiles(Array.from(e.target.files))
  }

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>New Recipe</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(mode === 'text' ? styles.tabActive : {}) }}
            onClick={() => setMode('text')}
          >
            Paste Text
          </button>
          <button
            style={{ ...styles.tab, ...(mode === 'photo' ? styles.tabActive : {}) }}
            onClick={() => setMode('photo')}
          >
            Upload Photos
          </button>
        </div>

        <div style={styles.body}>
          {mode === 'text' && (
            <textarea
              style={styles.textarea}
              placeholder="Paste your recipe text here..."
              value={text}
              onChange={e => setText(e.target.value)}
              rows={12}
            />
          )}

          {mode === 'photo' && (
            <div style={styles.uploadArea}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <button
                style={styles.uploadBtn}
                onClick={() => fileInputRef.current.click()}
              >
                Choose Images
              </button>
              {files.length > 0 && (
                <div style={styles.fileList}>
                  {files.map((f, i) => (
                    <div key={i} style={styles.fileName}>{f.name}</div>
                  ))}
                </div>
              )}
              {files.length === 0 && (
                <p style={styles.uploadHint}>
                  Select one or more recipe photos or pages
                </p>
              )}
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            style={styles.submitBtn}
            onClick={handleSubmit}
            disabled={loading || (mode === 'text' ? !text.trim() : files.length === 0)}
          >
            {loading ? 'Parsing...' : 'Add Recipe'}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  modal: {
    background: '#fff',
    borderRadius: 8,
    width: 520,
    maxWidth: '90vw',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px 16px',
    borderBottom: '1px solid rgba(0,0,0,0.1)',
  },
  title: {
    margin: 0,
    fontFamily: 'Manrope, sans-serif',
    fontWeight: 700,
    fontSize: 18,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 16,
    cursor: 'pointer',
    color: '#666',
    padding: 4,
  },
  tabs: {
    display: 'flex',
    padding: '0 24px',
    borderBottom: '1px solid rgba(0,0,0,0.1)',
  },
  tab: {
    background: 'none',
    border: 'none',
    fontFamily: 'Manrope, sans-serif',
    fontWeight: 400,
    fontSize: 13,
    cursor: 'pointer',
    padding: '12px 16px 10px',
    color: '#666',
    borderBottom: '2px solid transparent',
    marginBottom: -1,
  },
  tabActive: {
    color: '#000',
    fontWeight: 600,
    borderBottom: '2px solid #000',
  },
  body: {
    padding: '20px 24px',
    flex: 1,
    overflow: 'auto',
  },
  textarea: {
    width: '100%',
    fontFamily: 'Manrope, sans-serif',
    fontSize: 13,
    lineHeight: 1.6,
    border: '1px solid rgba(0,0,0,0.2)',
    borderRadius: 4,
    padding: 12,
    resize: 'vertical',
    boxSizing: 'border-box',
    outline: 'none',
  },
  uploadArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    padding: '24px 0',
  },
  uploadBtn: {
    background: '#000',
    color: '#fff',
    border: 'none',
    fontFamily: 'Manrope, sans-serif',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    padding: '10px 20px',
    borderRadius: 4,
  },
  uploadHint: {
    fontFamily: 'Manrope, sans-serif',
    fontSize: 12,
    color: '#999',
    margin: 0,
  },
  fileList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    width: '100%',
  },
  fileName: {
    fontFamily: 'Manrope, sans-serif',
    fontSize: 12,
    color: '#555',
    background: '#f5f5f5',
    padding: '4px 8px',
    borderRadius: 3,
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    padding: '16px 24px',
    borderTop: '1px solid rgba(0,0,0,0.1)',
  },
  cancelBtn: {
    background: 'none',
    border: '1px solid rgba(0,0,0,0.2)',
    fontFamily: 'Manrope, sans-serif',
    fontSize: 13,
    cursor: 'pointer',
    padding: '8px 16px',
    borderRadius: 4,
  },
  submitBtn: {
    background: '#000',
    color: '#fff',
    border: 'none',
    fontFamily: 'Manrope, sans-serif',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    padding: '8px 16px',
    borderRadius: 4,
    opacity: 1,
  },
}
