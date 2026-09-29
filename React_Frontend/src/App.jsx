import { useEffect, useState } from 'react'
import './App.css'

const API = 'https://demo-3ian.onrender.com'

const sample = {
  message: 'Hello from DocuMind',
  source: 'frontend-demo'
}

function App() {
  const [health, setHealth] = useState('checking')
  const [message, setMessage] = useState('Connecting to API…')
  const [payload, setPayload] = useState(JSON.stringify(sample, null, 2))
  const [response, setResponse] = useState(null)
  const [requestState, setRequestState] = useState('')
  const [busy, setBusy] = useState(false)

  async function checkHealth() {
    setHealth('checking')

    try {
      const [rootRes, healthRes] = await Promise.all([
        fetch(`${API}/`),
        fetch(`${API}/health`)
      ])

      if (!rootRes.ok || !healthRes.ok) {
        throw new Error('API returned an error')
      }

      const root = await rootRes.json()
      const status = await healthRes.json()

      setMessage(root.message || 'API is responding')
      setHealth(status.status === 'ok' ? 'online' : 'degraded')
    } catch {
      setMessage('Unable to reach the backend. Check the API connection.')
      setHealth('offline')
    }
  }

  useEffect(() => {
    checkHealth()
  }, [])

  async function sendEcho(event) {
    event.preventDefault()

    let body

    try {
      body = JSON.parse(payload)

      if (
        !body ||
        Array.isArray(body) ||
        typeof body !== 'object'
      ) {
        throw new Error(
          'Enter a JSON object, not an array or a value.'
        )
      }
    } catch (error) {
      setRequestState(
        error instanceof SyntaxError
          ? 'Invalid JSON. Check commas, quotes and braces.'
          : error.message
      )
      setResponse(null)
      return
    }

    setBusy(true)
    setRequestState('Sending request…')
    setResponse(null)

    try {
      const res = await fetch(`${API}/echo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(
          data.detail ||
          data.error ||
          `Request failed (${res.status})`
        )
      }

      setResponse(data)
      setRequestState('Request completed successfully')
    } catch (error) {
      setRequestState(
        error.message ||
        'Request failed. Check the backend connection.'
      )
    } finally {
      setBusy(false)
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
          API Playground
        </div>

        <div className="side-label side-bottom">
          DEMO ENVIRONMENT
        </div>

        <div className="env">
          <span className={`tiny-dot ${health}`}></span>
          <span>Live deployment</span>
        </div>

        <div className="sidebar-foot">
          ACA Summer Project
          <br />
          2026 · Demo
        </div>

      </aside>

      <main className="main">

        <header className="topbar">

          <div className="crumb">
            Workspace <span>/</span> API Playground
          </div>

          <div className="top-right">
            <span className="env-pill">
              LIVE
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
                DEVELOPER WORKSPACE
              </div>

              <h1>
                API Playground
              </h1>

              <p className="subhead">
                Explore the DocuMind demo API and verify your backend connection.
              </p>

            </div>

            <button
              className="refresh"
              onClick={checkHealth}
              type="button"
            >
              ↻ <span>Refresh status</span>
            </button>

          </div>

          <section className="connection card">

            <div className="connection-left">

              <div className={`status-icon ${health}`}>
                {health === 'online'
                  ? '✓'
                  : health === 'checking'
                    ? '…'
                    : '!'}
              </div>

              <div>

                <div className="card-kicker">
                  BACKEND CONNECTION
                </div>

                <div className="connection-title">

                  {health === 'online'
                    ? 'Backend is connected'
                    : health === 'checking'
                      ? 'Checking connection…'
                      : 'Backend unavailable'}

                </div>

                <div className="connection-desc">
                  {message}
                </div>

              </div>

            </div>

            <div className={`status-badge ${health}`}>

              <span className="tiny-dot"></span>

              {health === 'online'
                ? 'Operational'
                : health === 'checking'
                  ? 'Checking'
                  : 'Offline'}

            </div>

          </section>

          <div className="section-title">

            <div>

              <h2>
                Available endpoints
              </h2>

              <p>
                Use these routes to check connectivity and test JSON requests.
              </p>

            </div>

          </div>

          <div className="endpoint-grid">

            <div className="endpoint-card">

              <div className="endpoint-top">

                <span className="method get">
                  GET
                </span>

                <span className="endpoint-path">
                  /
                </span>

              </div>

              <div className="endpoint-name">
                Root
              </div>

              <p>
                Returns a welcome message from the backend.
              </p>

            </div>

            <div className="endpoint-card">

              <div className="endpoint-top">

                <span className="method get">
                  GET
                </span>

                <span className="endpoint-path">
                  /health
                </span>

              </div>

              <div className="endpoint-name">
                Health check
              </div>

              <p>
                Reports whether the API service is healthy.
              </p>

            </div>

            <div className="endpoint-card">

              <div className="endpoint-top">

                <span className="method post">
                  POST
                </span>

                <span className="endpoint-path">
                  /echo
                </span>

              </div>

              <div className="endpoint-name">
                Echo payload
              </div>

              <p>
                Accepts a JSON object and returns it in the response.
              </p>

            </div>

          </div>

          <section className="section-title test-title">

            <div>

              <h2>
                Request tester
              </h2>

              <p>
                Send a JSON payload to <code>POST /echo</code>.
              </p>

            </div>

            <span className="test-tag">
              LIVE API
            </span>

          </section>

          <div className="tester card">

            <form onSubmit={sendEcho}>

              <div className="editor-head">

                <label htmlFor="payload">

                  REQUEST BODY
                  <span>
                    · application/json
                  </span>

                </label>

                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    setPayload(
                      JSON.stringify(sample, null, 2)
                    )
                    setRequestState('')
                  }}
                >
                  Reset example
                </button>

              </div>

              <textarea
                id="payload"
                spellCheck="false"
                value={payload}
                onChange={(e) =>
                  setPayload(e.target.value)
                }
                rows={7}
              />

              <div className="submit-row">

                <span
                  className="request-status"
                  role="status"
                >
                  {requestState}
                </span>

                <button
                  className="send-button"
                  type="submit"
                  disabled={busy}
                >
                  {busy
                    ? 'Sending…'
                    : '▶ Send request'}
                </button>

              </div>

            </form>

            {response && (

              <div className="response">

                <div className="response-head">

                  <span>
                    RESPONSE
                  </span>

                  <span className="success-label">
                    ● 200 OK
                  </span>

                </div>

                <pre>
                  {JSON.stringify(
                    response,
                    null,
                    2
                  )}
                </pre>

              </div>

            )}

          </div>

          <footer>

            DocuMind · Demo environment

            <span>
              API base URL: {API}
            </span>

          </footer>

        </section>

      </main>

    </div>
  )
}

export default App
