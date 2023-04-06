
document.addEventListener("DOMContentLoaded", () => {
    const navLinks = document.querySelectorAll(".navbar a");
    const currentUrl = window.location.pathname;

    navLinks.forEach((link) => {
        if (link.getAttribute("href") === currentUrl) {
            link.classList.add("active");
        }
    });
});
