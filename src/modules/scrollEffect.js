document.addEventListener("scroll", () => {
  const sections = document.querySelectorAll("[data-scroll]");
  const windowHeight = window.innerHeight;

  sections.forEach((section) => {
    const position = section.getBoundingClientRect().top;
    if (position < windowHeight - 100) {
      section.classList.add("visible");
    }
  });
<<<<<<< HEAD
});
=======
});
>>>>>>> 58988cccb4345b4bda3b0c6c35256a642a789568
