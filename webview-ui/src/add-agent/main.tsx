import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AddAgentForm } from './AddAgentForm'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AddAgentForm />
  </StrictMode>,
)
