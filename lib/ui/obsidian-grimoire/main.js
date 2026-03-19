// main.js

class RPGStatusSystem {
    constructor() {
        // State
        this.stats = {
            hp: 100,
            maxHp: 100,
            mana: 50,
            maxMana: 50,
            xp: 0,
            maxXp: 100,
            level: 1
        };

        // DOM Elements
        this.ui = {
            hpBar: document.getElementById('hp-bar'),
            hpText: document.getElementById('hp-text'),
            manaBar: document.getElementById('mana-bar'),
            manaText: document.getElementById('mana-text'),
            xpBar: document.getElementById('xp-bar'),
            xpText: document.getElementById('xp-text'),
            
            // Buttons
            btnDamage: document.getElementById('btn-damage'),
            btnHeal: document.getElementById('btn-heal'),
            btnCast: document.getElementById('btn-cast'),
            btnXp: document.getElementById('btn-xp'),
            
            // Sliders
            sliderMusic: document.getElementById('music-slider'),
            sliderSfx: document.getElementById('sfx-slider'),
            sliderBrightness: document.getElementById('brightness-slider'),
            
            // Panel for effects
            panel: document.querySelector('.rpg-panel')
        };

        this.init();
    }

    init() {
        // Initial Render
        this.updateUI();

        // Event Listeners
        this.ui.btnDamage.addEventListener('click', () => this.takeDamage(20));
        this.ui.btnHeal.addEventListener('click', () => this.heal(20));
        this.ui.btnCast.addEventListener('click', () => this.castSpell(10));
        this.ui.btnXp.addEventListener('click', () => this.gainXp(25));

        // Slider Listeners
        this.ui.sliderBrightness.addEventListener('input', (e) => {
            const val = e.target.value;
            // brightness overlay effect
            document.body.style.filter = `brightness(${0.5 + (val / 200)})`;
        });
        
        // Add hover sounds or interaction effects here if needed
    }

    updateUI() {
        this.updateBar(this.ui.hpBar, this.ui.hpText, this.stats.hp, this.stats.maxHp);
        this.updateBar(this.ui.manaBar, this.ui.manaText, this.stats.mana, this.stats.maxMana);
        this.updateBar(this.ui.xpBar, this.ui.xpText, this.stats.xp, this.stats.maxXp, `LVL ${this.stats.level}`);
    }

    updateBar(bar, text, current, max, customText = null) {
        const percentage = Math.max(0, Math.min(100, (current / max) * 100));
        bar.style.width = `${percentage}%`;
        
        if (customText) {
            text.textContent = customText;
        } else {
            text.textContent = `${current}/${max}`;
        }

        // Color shifts based on percentage for HP
        if (bar.id === 'hp-bar') {
            if (percentage < 30) {
                // Critical Health: Dark blood red gradient
                bar.style.background = 'linear-gradient(180deg, #a00000, #500000)'; 
                bar.parentElement.style.boxShadow = '0 0 15px rgba(255, 0, 0, 0.8)';
                bar.parentElement.style.border = '2px solid #ff0000';
            } else {
                bar.style.background = ''; // Reset to CSS default
                bar.parentElement.style.boxShadow = '';
                bar.parentElement.style.border = '';
            }
        }
    }

    takeDamage(amount) {
        this.stats.hp = Math.max(0, this.stats.hp - amount);
        this.shakeEffect();
        this.flashEffect('red');
        this.updateUI();
    }

    heal(amount) {
        this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + amount);
        this.flashEffect('green');
        this.updateUI();
    }

    castSpell(amount) {
        if (this.stats.mana >= amount) {
            this.stats.mana -= amount;
            this.flashEffect('blue');
        } else {
            // Not enough mana effect
            this.ui.manaText.style.color = 'red';
            setTimeout(() => this.ui.manaText.style.color = '', 300);
            this.shakeEffect(this.ui.manaBar.parentElement);
        }
        this.updateUI();
    }

    gainXp(amount) {
        this.stats.xp += amount;
        if (this.stats.xp >= this.stats.maxXp) {
            // Level Up!
            this.stats.level++;
            this.stats.xp = this.stats.xp - this.stats.maxXp;
            this.stats.maxHp += 10;
            this.stats.hp = this.stats.maxHp;
            this.stats.maxMana += 5;
            this.stats.mana = this.stats.maxMana;
            this.levelUpEffect();
        }
        this.updateUI();
    }

    shakeEffect(element = this.ui.panel) {
        element.style.transform = 'translate(5px, 0)';
        setTimeout(() => element.style.transform = 'translate(-5px, 0)', 50);
        setTimeout(() => element.style.transform = 'translate(5px, 0)', 100);
        setTimeout(() => element.style.transform = 'translate(0, 0)', 150);
    }

    flashEffect(color) {
        let colorCode = '';
        if (color === 'red') colorCode = 'rgba(255, 0, 0, 0.2)';
        if (color === 'green') colorCode = 'rgba(0, 255, 0, 0.2)';
        if (color === 'blue') colorCode = 'rgba(0, 0, 255, 0.2)';

        const flash = document.createElement('div');
        flash.style.position = 'absolute';
        flash.style.top = '0';
        flash.style.left = '0';
        flash.style.width = '100%';
        flash.style.height = '100%';
        flash.style.background = colorCode;
        flash.style.pointerEvents = 'none';
        flash.style.borderRadius = '15px';
        flash.style.transition = 'opacity 0.3s';
        
        this.ui.panel.appendChild(flash);
        
        setTimeout(() => {
            flash.style.opacity = '0';
            setTimeout(() => flash.remove(), 300);
        }, 100);
    }

    levelUpEffect() {
        const text = this.ui.xpText;
        text.style.color = '#ffd700';
        text.style.transform = 'scale(1.5)';
        text.style.transition = 'all 0.5s';
        
        setTimeout(() => {
            text.style.color = '';
            text.style.transform = 'scale(1)';
        }, 1000);
    }
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    new RPGStatusSystem();
});
