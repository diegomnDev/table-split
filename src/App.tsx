import { BrowserRouter, Route, Routes } from 'react-router'
import { BillsScreen } from '@/screens/BillsScreen'
import { BillsProvider } from '@/state/bills-context'

export default function App() {
  return (
    <BillsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<BillsScreen />} />
        </Routes>
      </BrowserRouter>
    </BillsProvider>
  )
}
