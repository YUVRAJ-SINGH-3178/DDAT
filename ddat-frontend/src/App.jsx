import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import CreateCommitment from "./pages/CreateCommitment";
import SubmitProof from "./pages/SubmitProof";
import ProofFeed from "./pages/ProofFeed";
import Settings from "./pages/Settings";

function App() {
  const [wallet, setWallet] = useState(null);

  return (
    <BrowserRouter>
      <AppLayout wallet={wallet} setWallet={setWallet}>
        <Routes>
          <Route path="/" element={<Dashboard wallet={wallet} setWallet={setWallet} />} />
          <Route path="/create" element={<CreateCommitment wallet={wallet} />} />
          <Route path="/submit" element={<SubmitProof wallet={wallet} />} />
          <Route path="/feed" element={<ProofFeed wallet={wallet} />} />
          <Route path="/settings" element={<Settings wallet={wallet} setWallet={setWallet} />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

export default App;
