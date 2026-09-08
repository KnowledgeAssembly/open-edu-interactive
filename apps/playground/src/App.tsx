import { BrowserRouter, Routes, Route } from "react-router-dom";
import PlaygroundLayout from "./layout/PlaygroundLayout.js";
import { HomePage } from "./pages/HomePage.js";
import { EngineStoryPage } from "./pages/EngineStoryPage.js";
import { LessonStoryPage } from "./pages/LessonStoryPage.js";
import { CustomSpecPage } from "./pages/CustomSpecPage.js";

export function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PlaygroundLayout />}>
          <Route index element={<HomePage />} />
          <Route path="engine/:engine/:slug" element={<EngineStoryPage />} />
          <Route path="lesson/:slug" element={<LessonStoryPage />} />
          <Route path="custom" element={<CustomSpecPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}