import { useEffect, useState } from 'react'
import './App.css'

const API = 'https://demo-3ian.onrender.com'

function App() {
  const [health, setHealth] = useState('checking')

  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [document, setDocument] = useState(null)

  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [answer, setAnswer] = useState('')
  const [sources, setSources] = useState([])

  async function checkHealth() {
    try {
      const response = await fetch(`${API}/health`)

      if (!response.ok) {
        throw new Error()
      }

      const data = await response.json()

      setHealth(data.status === 'ok' ? 'online' : 'offline')
    } catch {
      setHealth('offline')
    }
  }

  useEffect(() => {
    checkHealth()
  }, [])

  function handleFileChange(event) {
    const file = event.target.files?.[0]

    if (!file) {
      setSelectedFile(null)
      return
    }

    if (file.type !== 'application/pdf') {
      setUploadMessage('Please select a PDF file.')
      setSelectedFile(null)
      return
    }

    setSelectedFile(file)
    setUploadMessage('')
  }

  async function uploadDocument() {
    if (!selectedFile) {
      setUploadMessage('Please select a PDF first.')
      return
    }

    setUploading(true)
    setUploadMessage('')
    setDocument(null)
    setAnswer('')
    setSources([])

    try {
      const formData = new FormData()

      formData.append('file', selectedFile)

      const response = await fetch(`${API}/upload`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail || 'Document upload failed.'
        )
      }

      setDocument(data)

      setUploadMessage(
        `✓ ${data.filename} processed successfully. ${data.chunks} chunks created.`
      )
    } catch (error) {
      setUploadMessage(
        error.message || 'Unable to upload document.'
      )
    } finally {
      setUploading(false)
    }
  }

  async function askQuestion(event) {
    event.preventDefault()

    if (!question.trim()) {
      return
    }

    if (!document) {
      setAnswer('Please upload a document first.')
      return
    }

    setAsking(true)
    setAnswer('')
    setSources([])

    try {
      const response = await fetch(`${API}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: question.trim()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail || 'Unable to answer the question.'
        )
      }

      setAnswer(data.answer || 'No answer was generated.')
      setSources(data.sources || [])
    } catch (error) {
      setAnswer(
        error.message || 'Something went wrong while querying the document.'
      )
    } finally {
      setAsking(false)
    }
  }

  return (
    <div className="app-shell">

      <aside className="sidebar">

        <div className="brand">
          <span className="brand-mark">D</span>
          <span>
            documind<span className="brand-dot">.</span>
          </span>
        </div>

        <div className="side-label">
          WORKSPACE
        </div>

        <div className="nav-item active">
          <span className="nav-icon">▦</span>
          Document Q&A
        </div>

        <div className="side-label side-bottom">
          SYSTEM STATUS
        </div>

        <div className="env">
          <span className={`tiny-dot ${health}`}></span>
          <span>
            {health === 'online'
              ? 'Backend online'
              : health === 'checking'
                ? 'Checking backend'
                : 'Backend offline'}
          </span>
        </div>

        <div className="sidebar-foot">
          ACA Summer Project
          <br />
          2026 · DocuMind
        </div>

      </aside>

      <main className="main">

        <header className="topbar">

          <div className="crumb">
            Workspace <span>/</span> Document Q&A
          </div>

          <div className="top-right">
            <span className="env-pill">
              {health === 'online' ? 'LIVE' : 'OFFLINE'}
            </span>

            <span className="avatar">
              D
            </span>
          </div>

        </header>

        <section className="content">

          <div className="intro-row">

            <div>
              <div className="overline">
                DOCUMENT INTELLIGENCE
              </div>

              <h1>
                Ask your documents.
              </h1>

              <p className="subtitle">
                Upload a PDF and ask questions using
                retrieval-augmented generation.
              </p>
            </div>

          </div>


          <section className="card">

            <div className="section-title">
              <span className="step-number">1</span>

              <div>
                <h2>Upload document</h2>

                <p>
                  Upload a PDF to build your document knowledge base.
                </p>
              </div>
            </div>

            <div className="upload-box">

              <input
                id="pdf-upload"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
              />

              <label htmlFor="pdf-upload">
                <span className="upload-icon">
                  ↑
                </span>

                <strong>
                  {selectedFile
                    ? selectedFile.name
                    : 'Choose a PDF'}
                </strong>

                <span>
                  {selectedFile
                    ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                    : 'PDF files up to 20 MB'}
                </span>
              </label>

            </div>

            <button
              className="primary-button"
              onClick={uploadDocument}
              disabled={uploading || !selectedFile}
            >
              {uploading
                ? 'Processing document…'
                : 'Upload & Process'}
            </button>

            {uploadMessage && (
              <div className="status-message">
                {uploadMessage}
              </div>
            )}

            {document && (
              <div className="document-info">

                <div>
                  <span>DOCUMENT</span>
                  <strong>{document.filename}</strong>
                </div>

                <div>
                  <span>CHUNKS</span>
                  <strong>{document.chunks}</strong>
                </div>

                <div>
                  <span>CHARACTERS</span>
                  <strong>
                    {document.characters.toLocaleString()}
                  </strong>
                </div>

              </div>
            )}

          </section>


          <section className="card">

            <div className="section-title">
              <span className="step-number">2</span>

              <div>
                <h2>Ask a question</h2>

                <p>
                  Ask anything about the uploaded document.
                </p>
              </div>
            </div>

            <form onSubmit={askQuestion}>

              <textarea
                className="question-input"
                placeholder={
                  document
                    ? 'e.g. What are the main conclusions of this document?'
                    : 'Upload a document first…'
                }
                value={question}
                onChange={(event) =>
                  setQuestion(event.target.value)
                }
                disabled={!document || asking}
              />

              <button
                className="primary-button"
                type="submit"
                disabled={!document || asking || !question.trim()}
              >
                {asking
                  ? 'Searching & generating answer…'
                  : 'Ask Question'}
              </button>

            </form>

          </section>


          {answer && (
            <section className="card answer-card">

              <div className="answer-heading">
                <span className="answer-icon">
                  ✦
                </span>

                <div>
                  <div className="overline">
                    RAG RESPONSE
                  </div>

                  <h2>Answer</h2>
                </div>
              </div>

              <div className="answer">
                {answer}
              </div>

              {sources.length > 0 && (
                <div className="sources">

                  <h3>
                    Retrieved sources
                  </h3>

                  {sources.map((source, index) => (
                    <div
                      className="source"
                      key={index}
                    >
                      <div className="source-header">
                        <strong>
                          Chunk {source.chunk_index + 1}
                        </strong>

                        <span>
                          Similarity:{' '}
                          {source.score.toFixed(3)}
                        </span>
                      </div>

                      <p>
                        {source.text}
                      </p>
                    </div>
                  ))}

                </div>
              )}

            </section>
          )}

        </section>

      </main>

    </div>
  )
}

export default App
