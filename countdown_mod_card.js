// --- No changes to imports ---
import {
  LitElement,
  css,
  html as cardHtml,
  svg as cardSvg
} from "https://unpkg.com/lit-element@2.0.1/lit-element.js?module";
import {
  render,
  html as bubbleHtml,
  svg as bubbleSvg
} from "https://unpkg.com/lit-html@1.1.2/lit-html.js?module";


class CountdownModCard extends LitElement {

  // ... (All JavaScript code from the previous version remains unchanged) ...
  static _getTemplates() {
    try {
      const lovelace = document.querySelector("home-assistant")
        ?.shadowRoot?.querySelector("home-assistant-main")
        ?.shadowRoot?.querySelector("ha-panel-lovelace")
        ?.lovelace;
      if (lovelace && lovelace.config) {
        return lovelace.config.countdown_mod_card_templates || {};
      }
      return {};
    } catch (e) {
      console.error("Error getting global templates", e);
      return {};
    }
  }

  static get properties() {
    return {
      hass: {},
      config: {},
      _hours: { state: true },
      _minutes: { state: true },
      _seconds: { state: true },
      _remainingTime: { state: true },
      _isSliding: { state: true },
      _slidingType: { state: true },
      _slidingCurrentValue: { state: true },
    };
  }

  constructor() {
    super();
    this._hours = 0; this._minutes = 0; this._seconds = 0; this._remainingTime = "00:00:00"; this._timerInterval = null; this._isSliding = false; this._slidingType = null; this._slidingInitialValue = 0; this._slidingCurrentValue = 0; this._interactionStartY = 0; this._wasActiveOnSlideStart = false; this._configProcessed = false;
    this._previousTimerState = null;
    this._sliderBubbleEl = null;

    this._handleInteractionMove = this._handleInteractionMove.bind(this);
    this._handleInteractionEnd = this._handleInteractionEnd.bind(this);
  }
  
  setConfig(config) {
    if (!config.timer_entity) throw new Error("You need to define a timer_entity");
    this.config = config;
    this._configProcessed = false;
  }

  updated(changedProperties) {
    if (this.hass && !this._configProcessed) {
      this._processConfig();
    }
    
    if (changedProperties.has('hass') && this._configProcessed) {
      const entity = this.hass.states[this.config.timer_entity];
      const newState = entity ? entity.state : 'unavailable';
      if (this._previousTimerState === 'active' && newState !== 'active') {
        this._hours = 0;
        this._minutes = 0;
        this._seconds = 0;
      }
      this._previousTimerState = newState;
      this._updateTimerState();
    }
  }

  _processConfig() {
    let cardConfig = { ...this.config };
    if (cardConfig.template) {
      const templates = CountdownModCard._getTemplates();
      if (templates[cardConfig.template]) cardConfig = { ...templates[cardConfig.template], ...cardConfig };
    }
    this.config = cardConfig;
    this._hours = 0; this._minutes = 0; this._seconds = 0;
    this._hourSensitivity = this.config.hour_sensitivity || 5;
    this._minuteSensitivity = this.config.minute_sensitivity || 5;
    this._hourStep = this.config.hour_step > 0 ? this.config.hour_step : 1;
    this._minuteStep = this.config.minute_step > 0 ? this.config.minute_step : 1;
    this._configProcessed = true;
  }
  
  _updateTimerState() {
    const entity = this.hass.states[this.config.timer_entity];
    if (!entity) return;
    if (entity.state === 'active') {
      this._startUpdatingRemainingTime(entity);
    } else {
      this._stopUpdatingRemainingTime();
      this._remainingTime = "00:00:00";
    }
  }

  _startUpdatingRemainingTime(entity) {
    if (this._timerInterval) return;
    const finishesAt = new Date(entity.attributes.finishes_at).getTime();
    const updateDisplay = () => {
      const now = new Date().getTime();
      const remainingMs = finishesAt - now;
      if (remainingMs < -1000) {
        this._stopUpdatingRemainingTime();
        return;
      }
      const displayMs = Math.max(0, remainingMs);
      const hours = Math.floor(displayMs / (1000 * 60 * 60));
      const minutes = Math.floor((displayMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((displayMs % (1000 * 60)) / 1000);
      this._remainingTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };
    updateDisplay();
    this._timerInterval = setInterval(updateDisplay, 200);
  }

  _stopUpdatingRemainingTime(){if(this._timerInterval){clearInterval(this._timerInterval);this._timerInterval=null}}
  
  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopUpdatingRemainingTime();
    window.removeEventListener("mousemove", this._handleInteractionMove);
    window.removeEventListener("mouseup", this._handleInteractionEnd);
    window.removeEventListener("touchmove", this._handleInteractionMove);
    window.removeEventListener("touchend", this._handleInteractionEnd);
    this._sliderBubbleEl?.remove();
    this._sliderBubbleEl = null;
  }
  
  _evaluateTemplate(value) {
    if (!this._configProcessed) return value;
    if (typeof value !== 'string') return value;
    const trimmedValue = value.trim();
    if (!trimmedValue.startsWith('[[[') || !trimmedValue.endsWith(']]]')) return value;
    try {
      const template = trimmedValue.substring(3, trimmedValue.length - 3);
      const entityState = this.hass.states[this.config.timer_entity];
      const rawVariables = this.config.variables || {};
      const evaluatedVariables = {};
      for (const key in rawVariables) {
        if (typeof rawVariables[key] === 'string' && rawVariables[key].trim().startsWith('[[[')) {
          const varTemplate = rawVariables[key].substring(3, rawVariables[key].length - 3);
          const varFunc = new Function('states', 'entity', 'user', 'hass', 'config', varTemplate);
          evaluatedVariables[key] = varFunc(this.hass.states, entityState, this.hass.user, this.hass, this.config);
        } else {
          evaluatedVariables[key] = rawVariables[key];
        }
      }
      const func = new Function('states', 'entity', 'user', 'hass', 'config', 'variables', template);
      return func(this.hass.states, entityState, this.hass.user, this.hass, this.config, evaluatedVariables);
    } catch (e) {
      console.error("Error evaluating template:", e, "Template:", value);
      return `TEMPLATE_ERROR`;
    }
  }
  
  _computeStyles(e){if(!this._configProcessed || !this.config.styles||!this.config.styles[e])return"";return this.config.styles[e].map((t=>{const s=Object.keys(t)[0],i=this._evaluateTemplate(t[s]);return`${s}: ${i};`})).join("")}
  
  _handleStart() {
    const durationString = `${String(this._hours).padStart(2, '0')}:${String(this._minutes).padStart(2, '0')}:${String(this._seconds).padStart(2, '0')}`;
    const totalSeconds = this._hours * 3600 + this._minutes * 60 + this._seconds;
    if (totalSeconds > 0) {
      this._stopUpdatingRemainingTime();
      this.hass.callService("timer", "start", { entity_id: this.config.timer_entity, duration: durationString });
    }
  }
  
  _handleStop() { this.hass.callService("timer", "cancel", { entity_id: this.config.timer_entity }); }

  _handleInteractionStart(e, type) {
    if (this._isSliding) return;
    e.preventDefault();
    const entityState = this.hass.states[this.config.timer_entity];
    this._wasActiveOnSlideStart = entityState && entityState.state === 'active';
    if (this._wasActiveOnSlideStart) { const [h, m, s] = this._remainingTime.split(':').map(Number); this._hours = h; this._minutes = m; this._seconds = s; } else { this._seconds = 0; }
    
    this._isSliding = true;
    this._slidingType = type;
    this._slidingInitialValue = type === 'hours' ? this._hours : this._minutes;
    this._slidingCurrentValue = this._slidingInitialValue;
    
    const isTouch = e.type === 'touchstart';
    this._interactionStartY = isTouch ? e.touches[0].clientY : e.clientY;

    this._createAndShowBubble(e.currentTarget, isTouch ? e.touches[0] : e);

    window.addEventListener(isTouch ? 'touchmove' : 'mousemove', this._handleInteractionMove);
    window.addEventListener(isTouch ? 'touchend' : 'mouseup', this._handleInteractionEnd);
  }

  _handleInteractionMove(e) {
    if (!this._isSliding) return;
    e.preventDefault();
    const isTouch = e.type === 'touchmove';
    const currentY = isTouch ? e.touches[0].clientY : e.clientY;
    const deltaY = this._interactionStartY - currentY;
    const sensitivity = this._slidingType === 'hours' ? this._hourSensitivity : this._minuteSensitivity;
    const step = this._slidingType === 'hours' ? this._hourStep : this._minuteStep;
    const valueChange = (deltaY / sensitivity);
    let rawValue = this._slidingInitialValue + valueChange;
    let newValue = Math.round(rawValue / step) * step;
    const max = this._slidingType === 'hours' ? 23 : 59;
    this._slidingCurrentValue = Math.max(0, Math.min(newValue, max));
    
    this._updateBubbleContent();
  }

  _handleInteractionEnd() {
    if (!this._isSliding) return;
    if (this._slidingType === 'hours') { this._hours = this._slidingCurrentValue; } else { this._minutes = this._slidingCurrentValue; }
    this._isSliding = false;
    this._slidingType = null;
    
    this._hideAndRemoveBubble();

    window.removeEventListener('mousemove', this._handleInteractionMove);
    window.removeEventListener('mouseup', this._handleInteractionEnd);
    window.removeEventListener('touchmove', this._handleInteractionMove);
    window.removeEventListener('touchend', this._handleInteractionEnd);
    
    if (this._wasActiveOnSlideStart) { const totalSeconds = this._hours * 3600 + this._minutes * 60 + this._seconds; if (totalSeconds > 0) { this._handleStart(); } else { this._handleStop(); } }
    this._wasActiveOnSlideStart = false;
  }

  _createAndShowBubble(targetElement, event) {
    if (this._sliderBubbleEl) this._sliderBubbleEl.remove();

    this._sliderBubbleEl = document.createElement('div');
    document.body.appendChild(this._sliderBubbleEl);

    const rect = targetElement.getBoundingClientRect();
    const clientX = event.clientX;
    const elementCenterX = rect.left + rect.width / 2;
    const bubbleSide = clientX < elementCenterX ? 'right' : 'left';

    this._sliderBubbleEl.className = `slider-bubble ${bubbleSide}`;
    this._sliderBubbleEl.style.top = `${rect.top + rect.height / 2}px`;
    this._sliderBubbleEl.style.left = bubbleSide === 'left' ? `${rect.left}px` : `${rect.right}px`;
    
    this._updateBubbleContent();
  }

  _updateBubbleContent() {
    if (!this._sliderBubbleEl) return;
    const max = this._slidingType === 'hours' ? 23 : 59;
    const height = 140;
    const width = 20;
    const ticks = Array.from({ length: max + 1 }, (_, i) => {
        const y = height - (i / max) * height;
        let x1;
        if (i % 10 === 0) x1 = 5;
        else if (i % 5 === 0) x1 = 10;
        else x1 = 13;
        return bubbleSvg`<line x1=${x1} y1=${y} x2=${width - 2} y2=${y} />`;
    });
    const indicatorY = height - (this._slidingCurrentValue / max) * height;

    const bubbleTemplate = bubbleHtml`
      <div class="bubble-value">${String(this._slidingCurrentValue).padStart(2, '0')}</div>
      <div class="bubble-ruler">
        ${bubbleSvg`<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
          <line class="main-line" x1=${width - 2} y1="0" x2=${width - 2} y2=${height} />
          ${ticks}
          <circle class="indicator" cx=${width - 2} cy=${indicatorY} r="3" />
        </svg>`}
      </div>
    `;
    render(bubbleTemplate, this._sliderBubbleEl);
  }

  _hideAndRemoveBubble() {
    if (!this._sliderBubbleEl) return;
    this._sliderBubbleEl.classList.add('closing');
    this._sliderBubbleEl.addEventListener('animationend', () => {
      this._sliderBubbleEl?.remove();
      this._sliderBubbleEl = null;
    }, { once: true });
  }

  render() {
    if (!this._configProcessed) { return cardHtml``; }
    const entityState = this.hass.states[this.config.timer_entity];
    const isTimerActive = entityState && entityState.state === 'active';
    const isStartDisabled = (this._hours * 3600 + this._minutes * 60) === 0;
    let part1, part2;
    const [h, m, s] = this._remainingTime.split(':').map(Number);
    const totalRemainingSeconds = h * 3600 + m * 60 + s;
    if (this._isSliding) {
        part1 = String(this._slidingType === 'hours' ? this._slidingCurrentValue : this._hours).padStart(2, '0');
        part2 = String(this._slidingType === 'minutes' ? this._slidingCurrentValue : this._minutes).padStart(2, '0');
    } else if (isTimerActive) {
      if (totalRemainingSeconds > 0 && totalRemainingSeconds < 60 && !this.config.always_show_minutes) { part1 = String(m).padStart(2, '0'); part2 = String(s).padStart(2, '0'); } else { part1 = String(h).padStart(2, '0'); part2 = String(m).padStart(2, '0'); }
    } else { part1 = String(this._hours).padStart(2, '0'); part2 = String(this._minutes).padStart(2, '0'); }
    const currentIcon = isTimerActive ? this.config.stop_icon : this.config.start_icon;
    let buttonContent;
    if (currentIcon) { const evaluatedIcon = this._evaluateTemplate(currentIcon); if (evaluatedIcon.startsWith('mdi:')) { buttonContent = cardHtml`<ha-icon .icon=${evaluatedIcon}></ha-icon>`; } else { buttonContent = cardHtml`<img src=${evaluatedIcon} />`; } } else { buttonContent = isTimerActive ? '停用' : '开始'; }
    return cardHtml`
      <ha-card style=${this._computeStyles('card')}>
        <div class="main-container" style=${this._computeStyles('grid')}>
          ${this.config.title ? cardHtml`<div class="title" style=${this._computeStyles('title')}>${this._evaluateTemplate(this.config.title)}</div>` : ''}
          <div class="time-display">
            <div class="time-setter ${isTimerActive ? 'active' : ''}" style=${this._computeStyles('timer')}>
              <div class="time-part ${this._isSliding && this._slidingType === 'hours' ? 'sliding' : ''}" @mousedown="${(e) => this._handleInteractionStart(e, 'hours')}" @touchstart="${(e) => this._handleInteractionStart(e, 'hours')}">${part1}</div>
              <div class="colon ${isTimerActive ? 'blinking' : ''}">:</div>
              <div class="time-part ${this._isSliding && this._slidingType === 'minutes' ? 'sliding' : ''}" @mousedown="${(e) => this._handleInteractionStart(e, 'minutes')}" @touchstart="${(e) => this._handleInteractionStart(e, 'minutes')}">${part2}</div>
            </div>
          </div>
          <button class="action-button ${isTimerActive ? 'stop' : 'start'}" style=${this._computeStyles('button')} @click="${isTimerActive ? this._handleStop : this._handleStart}" ?disabled="${!isTimerActive && isStartDisabled}">${buttonContent}</button>
        </div>
      </ha-card>
    `;
  }

  // --- CSS ONLY CHANGE ---
  static get styles() {
    const styleId = 'countdown-mod-card-bubble-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          .slider-bubble { position: fixed; z-index: 9999; width: 100px; height: 160px; background: rgba(40, 40, 40, 0.9); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-radius: 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 30px rgba(0,0,0,0.4); pointer-events: none; opacity: 0; }
          .slider-bubble.left { transform-origin: right center; animation: bubble-appear-left 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
          .slider-bubble.right { transform-origin: left center; animation: bubble-appear-right 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
          .slider-bubble.closing.left { animation: bubble-disappear-left 0.2s ease-out forwards; }
          .slider-bubble.closing.right { animation: bubble-disappear-right 0.2s ease-out forwards; }
          @keyframes bubble-appear-left { from { opacity: 0; transform: translate(calc(-100% - 10px), -50%) scale(0.8); } to { opacity: 1; transform: translate(calc(-100% - 10px), -50%) scale(1); } }
          @keyframes bubble-appear-right { from { opacity: 0; transform: translate(10px, -50%) scale(0.8); } to { opacity: 1; transform: translate(10px, -50%) scale(1); } }
          @keyframes bubble-disappear-left { to { opacity: 0; transform: translate(calc(-100% - 10px), -50%) scale(0.8); } }
          @keyframes bubble-disappear-right { to { opacity: 0; transform: translate(10px, -50%) scale(0.8); } }
          .bubble-value { font-size: 48px; font-weight: 500; color: white; flex-grow: 1; display: flex; align-items: center; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          .bubble-ruler { height: 140px; width: 20px; margin-right: 10px; }
          .bubble-ruler svg { width: 100%; height: 100%; }
          .bubble-ruler line { stroke: rgba(255, 255, 255, 0.5); stroke-width: 1.5; stroke-linecap: round; }
          .bubble-ruler .main-line { stroke-width: 2; }
          .bubble-ruler .indicator { fill: var(--primary-color, #03a9f4); stroke: white; stroke-width: 1.5; }
        `;
        document.head.appendChild(style);
    }

    return css`
      ha-card {
        padding: 12px;
        box-sizing: border-box;
        position: relative;
        display: flex;
        /* THE FIX Part 1: Allow content to be visually rendered outside the card's bounds */
        overflow: visible !important;
      }
      .main-container { width: 100%; display: grid; grid-template-columns: 1fr auto; grid-template-areas: "timer button"; align-items: center; }
      .title { grid-area: title; display: flex; align-items: center; justify-content: center; }
      .time-display { grid-area: timer; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-feature-settings: 'tnum'; font-variant-numeric: tabular-nums; overflow: hidden; }
      .action-button { grid-area: button; }
      .time-setter { display: flex; justify-content: center; align-items: baseline; font-size: 40px; font-weight: 400; color: var(--primary-text-color); transition: color 0.3s ease; }
      .time-setter.active { color: var(--primary-color); }
      .time-part { padding: 4px 8px; border-radius: 8px; cursor: grab; user-select: none; transition: background-color 0.2s ease, color 0.2s ease; }
      .time-part:hover { background-color: rgba(120, 120, 128, 0.16); }
      .time-part.sliding {
        cursor: grabbing;
        background-color: var(--primary-color);
        color: white;
        /* THE FIX Part 2: Promote the sliding element to its own layer */
        position: relative;
        z-index: 1;
      }
      .colon { margin: 0 2px; }
      .colon.blinking { animation: blink 1s step-end infinite; }
      @keyframes blink { 50% { opacity: 0; } }
      .action-button { border-radius: 50%; border: none; width: 50px; height: 50px; font-size: 14px; cursor: pointer; transition: all 0.3s ease; flex-shrink: 0; display: flex; align-items: center; justify-content: center; padding: 0; }
      .action-button:disabled { opacity: 0.5; cursor: not-allowed; }
      .action-button.stop { background: #48484a; color: white; }
      .action-button.start { background: #30d158; color: white; }
      .action-button.start:disabled { background: #48484a; color: #8e8e93; }
      .action-button ha-icon, .action-button img { color: inherit; max-width: 70%; max-height: 70%; }
    `;
  }
}

customElements.define('countdown-mod-card', CountdownModCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "countdown-mod-card", name: "Countdown Mod Card", description: "A compact countdown card with actions and ruler popup.", preview: true });
