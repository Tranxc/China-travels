document.addEventListener("scroll", () => {
  const sections = document.querySelectorAll("[data-scroll]");
  const windowHeight = window.innerHeight;

  sections.forEach((section) => {
    const position = section.getBoundingClientRect().top;
    if (position < windowHeight - 100) {
      section.classList.add("visible");
    }
  });
});
