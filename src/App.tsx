import { BrowserRouter, Route, Routes } from 'react-router'
import { BillScreen } from '@/screens/BillScreen'
import { BillsScreen } from '@/screens/BillsScreen'
import { ImportScreen } from '@/screens/ImportScreen'
import { LegalScreen } from '@/screens/LegalScreen'
import { NotFoundScreen } from '@/screens/NotFoundScreen'
import { ResultScreen } from '@/screens/ResultScreen'
import { BillsProvider } from '@/state/bills-context'

export default function App() {
  return (
    <BillsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<BillsScreen />} />
          <Route path="/b/:billId" element={<BillScreen />} />
          <Route path="/b/:billId/resultado" element={<ResultScreen />} />
          <Route path="/i" element={<ImportScreen />} />
          <Route path="/legal" element={<LegalScreen />} />
          <Route path="*" element={<NotFoundScreen />} />
        </Routes>
      </BrowserRouter>
    </BillsProvider>
  )
}
