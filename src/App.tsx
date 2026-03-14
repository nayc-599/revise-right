import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/HomePage';
import { TaskManagerPage } from './pages/TaskManagerPage';
import { GameChoicePage } from './pages/GameChoicePage';
import { GameShootingPage } from './pages/GameShootingPage';
import { GameWheelPage } from './pages/GameWheelPage';
import { ReflectionPage } from './pages/ReflectionPage';
import { GoodnightPage } from './pages/GoodnightPage';
import { QuizPage } from './pages/QuizPage';

function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tasks" element={<TaskManagerPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/game-choice" element={<GameChoicePage />} />
          <Route path="/game/shooting" element={<GameShootingPage />} />
          <Route path="/game/wheel" element={<GameWheelPage />} />
          <Route path="/reflection" element={<ReflectionPage />} />
          <Route path="/goodnight" element={<GoodnightPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

export default App;