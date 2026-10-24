import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import Home from "./pages/Home";
import Play from "./pages/Play";
import Editor from "./pages/Editor";
import BrandKit from "./pages/BrandKit";

function App() {
  return (
    <div className="App dark">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/play/:id" element={<Play />} />
          <Route path="/edit/:id" element={<Editor />} />
          <Route path="/brand" element={<BrandKit />} />
        </Routes>
      </BrowserRouter>
      <Toaster theme="dark" position="top-center" />
    </div>
  );
}

export default App;
