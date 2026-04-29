import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// Списък със страници, които ТРЯБВА да помнят докъде са скролнати
const LIST_PAGES = [
  "/my-requests",
  "/my-received-offers",
  "/my-responses",
  "/notifications",
  "/browse",
  "/properties",
];

const ScrollToTop = () => {
  const location = useLocation();
  const navType = useNavigationType();
  const currentPathRef = useRef(location.pathname);

  useEffect(() => {
    // 1. Намираме твоя специфичен скрол контейнер
    const scrollContainer = document.getElementById("app-scroll");
    if (!scrollContainer) return;

    // 2. Когато потребителят напуска страница (преди да се рендира новата)
    const prevPath = currentPathRef.current;
    if (LIST_PAGES.includes(prevPath)) {
      // Запазваме скрола в sessionStorage за съответния път
      sessionStorage.setItem(`scrollPos:${prevPath}`, scrollContainer.scrollTop.toString());
    }

    // 3. Логика за възстановяване при новата страница
    const isListPage = LIST_PAGES.includes(location.pathname);
    const savedPos = sessionStorage.getItem(`scrollPos:${location.pathname}`);

    // Ако се връщаме назад (POP) към списък и имаме запазена позиция
    if (navType === "POP" && isListPage && savedPos) {
      // Използваме setTimeout(0), за да сме сигурни, че React е рендирал DOM елементите
      setTimeout(() => {
        scrollContainer.scrollTop = parseInt(savedPos, 10);
      }, 0);
    } else {
      // За всички детайлни страници или при нормална навигация (PUSH) -> Скролваме най-горе
      scrollContainer.scrollTop = 0;
    }

    // Обновяваме текущия път за следващия цикъл
    currentPathRef.current = location.pathname;

  }, [location.pathname, navType]);

  return null; // Този компонент не рендира нищо визуално
};

export default ScrollToTop;