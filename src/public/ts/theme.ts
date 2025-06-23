export function initializeThemeSwitcher(): void {
    const themeSwitcher = document.getElementById('theme-switcher');
    const sunIcon = document.querySelector('.theme-icon-sun');
    const moonIcon = document.querySelector('.theme-icon-moon');
    const body = document.body;

    if (!themeSwitcher || !sunIcon || !moonIcon) {
        console.error('Theme switcher elements not found!');
        return;
    }

    const applyTheme = (theme: 'light' | 'dark') => {
        if (theme === 'light') {
            body.classList.add('light-theme');
            (sunIcon as HTMLElement).style.display = 'none';
            (moonIcon as HTMLElement).style.display = 'inline-block';
        } else {
            body.classList.remove('light-theme');
            (sunIcon as HTMLElement).style.display = 'inline-block';
            (moonIcon as HTMLElement).style.display = 'none';
        }
        localStorage.setItem('theme', theme);
        // Re-render icons to apply color changes if any
        if (window.lucide) {
            window.lucide.createIcons();
        }
    };

    themeSwitcher.addEventListener('click', () => {
        const currentTheme = body.classList.contains('light-theme') ? 'light' : 'dark';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
    });

    // Apply saved theme on initial load
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'light' || (savedTheme === null && !prefersDark)) {
        applyTheme('light');
    } else {
        applyTheme('dark');
    }
}

// Add lucide to the window object type
declare global {
    interface Window {
        lucide: any;
    }
}
