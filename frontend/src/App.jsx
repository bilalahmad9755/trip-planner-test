import Home from './pages/Home';
import './App.css';

function App() {
  return (
      <div className="min-h-screen bg-bg-dark text-slate-900 font-sans selection:bg-primary selection:text-white">
        <header className="sticky top-0 z-50 border-b border-amber-950/10 bg-white/75 backdrop-blur-xl shadow-[0_10px_30px_rgba(148,123,81,0.08)]">
          <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3 group">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 via-emerald-500 to-amber-400 text-white shadow-[0_14px_28px_rgba(15,118,110,0.28)] transition-transform group-hover:rotate-6">
                <span className="text-xl font-black">S</span>
              </div>
              <span className="bg-gradient-to-r from-slate-900 via-teal-700 to-amber-700 bg-clip-text text-xl font-bold tracking-tight text-transparent">
                spotter-labs-test-bilal
              </span>
            </div>
          </div>
        </header>

        <main className="py-12">
          <Home />
        </main>

        <footer className="mt-20 border-t border-amber-950/10 bg-white/45 py-12">
          <div className="max-w-[1400px] mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          </div>
        </footer>
      </div>
  );
}

export default App;
