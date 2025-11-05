const scenes = document.querySelectorAll(".scene");
let current = 0;
let scrolling = false;

window.addEventListener("wheel", (e) => {
  if (scrolling) return;
  scrolling = true;

  if (e.deltaY > 0 && current < scenes.length - 1) {
    current++;
  } else if (e.deltaY < 0 && current > 0) {
    current--;
  }

  scenes[current].scrollIntoView({ behavior: "smooth" });

  setTimeout(() => (scrolling = false), 1000);
});
