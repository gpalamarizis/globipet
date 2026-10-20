import { Navigate } from 'react-router-dom'

// Η παλιά σελίδα «/community» ήταν κενό placeholder («υπό ανάπτυξη»).
// Οι κοινότητες ζουν στο «/communities» — ανακατεύθυνση εκεί.
export default function Community() {
  return <Navigate to="/communities" replace />
}
