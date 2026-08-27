(function () {
    "use strict";

    /* =========================================================
       CONFIGURATION
       ========================================================= */

    const PLAYER_ID = "parijat-floating-player";

    const PLAYLIST_URL =
        "https://cdn.jsdelivr.net/gh/IntenseParijat/cdn@main/blogger/scripts/playlist.json";

    /*
     * Below this width the player becomes a smaller,
     * screen-friendly floating player.
     *
     * It is NOT placed in Blogger's sidebar.
     */
    const SMALL_SCREEN_WIDTH = 768;

    const VIEWPORT_MARGIN = 16;

    const STORAGE = {
        track: "parijatPlayer.track",
        time: "parijatPlayer.time",
        volume: "parijatPlayer.volume",
        muted: "parijatPlayer.muted",
        playing: "parijatPlayer.playing",
        mode: "parijatPlayer.mode",
        display: "parijatPlayer.displayMode",
        left: "parijatPlayer.left",
        top: "parijatPlayer.top"
    };


    /* =========================================================
       STATE
       ========================================================= */

    let tracks = [];
    let currentTrack = 0;

    /*
     * 0 = sequential
     * 1 = shuffle
     * 2 = repeat
     */
    let playMode = 0;

    /*
     * expanded / minimized
     */
    let displayMode = "expanded";

    let playerRoot = null;
    let player = null;
    let audio = null;

    let prevBtn = null;
    let playBtn = null;
    let nextBtn = null;

    let seekbar = null;

    let trackTitle = null;
    let trackArtist = null;

    let muteBtn = null;
    let volumeBar = null;
    let modeBtn = null;

    let minimizeBtn = null;
    let bubble = null;

    let originalTitle = document.title;

    /*
     * Used when the browser blocks autoplay.
     * The saved intent remains "playing".
     */
    let shouldBePlaying = false;

    /*
     * Drag state.
     */
    let dragging = false;
    let dragMoved = false;

    let pointerId = null;

    let dragStartPointerX = 0;
    let dragStartPointerY = 0;

    let dragStartLeft = 0;
    let dragStartTop = 0;


    /* =========================================================
       HELPERS
       ========================================================= */

    function isSmallScreen() {
        return window.innerWidth <= SMALL_SCREEN_WIDTH;
    }


    function clamp(value, min, max) {
        return Math.max(
            min,
            Math.min(value, max)
        );
    }


    function readNumber(key, fallback) {

        const value =
            Number(
                localStorage.getItem(key)
            );

        return Number.isFinite(value)
            ? value
            : fallback;
    }


    /* =========================================================
       PLAYER HTML
       ========================================================= */

    const PLAYER_HTML = `
    <div class="parijat-player">

      <div class="parijat-glow"></div>

      <div class="parijat-top-row">

        <button
          type="button"
          class="parijat-control"
          id="parijat-prev"
          aria-label="Previous track">

          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="white">

            <path
              d="M6 6h2v12H6zm3.5 6L18 18V6z"/>
          </svg>

        </button>


        <button
          type="button"
          class="parijat-control"
          id="parijat-play"
          aria-label="Play">

          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="white">

            <path
              d="M8 5v14l11-7z"/>
          </svg>

        </button>


        <button
          type="button"
          class="parijat-control"
          id="parijat-next"
          aria-label="Next track">

          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="white">

            <path
              d="M16 6h2v12h-2zM6 18l8.5-6L6 6z"/>
          </svg>

        </button>

      </div>


      <div class="parijat-track-info">

        <div
          id="parijat-track-title"
          class="parijat-track-title">
          LOADING...
        </div>

        <div
          id="parijat-track-artist"
          class="parijat-track-artist">
        </div>

      </div>


      <div class="parijat-equalizer">

        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>

      </div>


      <div class="parijat-seek-row">

        <input
          type="range"
          id="parijat-seek"
          min="0"
          max="100"
          step="0.01"
          value="0"
          aria-label="Seek">

        <button
          type="button"
          id="parijat-mode"
          class="parijat-round-button"
          aria-label="Playback mode">
        </button>

      </div>


      <div class="parijat-volume-row">

        <button
          type="button"
          id="parijat-mute"
          class="parijat-round-button"
          aria-label="Mute">
        </button>

        <input
          type="range"
          id="parijat-volume"
          min="0"
          max="1"
          step="0.01"
          value="1"
          aria-label="Volume">

      </div>


      <audio
        id="parijat-audio"
        preload="metadata">
      </audio>

    </div>
  `;


    /* =========================================================
       PLAYER CSS
       ========================================================= */

    const PLAYER_CSS = `
    #${PLAYER_ID} {

      position: fixed;

      top: 85px;
      right: 32px;

      left: auto;

      width: 360px;
      max-width:
        calc(100vw - 24px);

      margin: 0;
      padding: 0;

      z-index: 2147483000;

      overflow: visible;

      pointer-events: auto;

      user-select: none;
      -webkit-user-select: none;

      touch-action: none;

      cursor: grab;

      box-sizing: border-box;
    }


    #${PLAYER_ID}.dragging {
      cursor: grabbing;
    }


    /* =======================================================
       MAIN PLAYER
       ======================================================= */

    #${PLAYER_ID} .parijat-player {

      position: relative;

      width: 100%;
      max-width: 360px;

      box-sizing: border-box;

      padding: 20px;

      border-radius: 20px;

      background:
        linear-gradient(
          145deg,
          rgba(20,20,20,.96),
          rgba(35,35,35,.88)
        );

      border:
        1px solid
        rgba(255,115,87,.25);

      box-shadow:
        0 0 25px
        rgba(255,115,87,.12),

        inset 0 0 25px
        rgba(255,255,255,.03);

      overflow: hidden;

      backdrop-filter: blur(18px);

      pointer-events: auto;
    }


    #${PLAYER_ID} .parijat-glow {

      position: absolute;

      inset: 0;

      background:
        radial-gradient(
          circle at center,
          rgba(255,115,87,.12),
          transparent 70%
        );

      opacity: 0;

      transition:
        opacity .4s ease;

      pointer-events: none;
    }


    #${PLAYER_ID} .parijat-player.playing
      .parijat-glow {

      opacity: 1;
    }


    /* =======================================================
       TOP BUTTONS
       ======================================================= */

    #${PLAYER_ID} .parijat-top-row {

      display: flex;

      justify-content: center;

      align-items: center;

      gap: 16px;

      margin-bottom: 16px;
    }


    #${PLAYER_ID} .parijat-control {

      width: 58px;
      height: 58px;

      border: none;

      border-radius: 50%;

      display: flex;

      align-items: center;
      justify-content: center;

      padding: 0;

      color: white;

      background:
        linear-gradient(
          145deg,
          #ff7357,
          #ff512f
        );

      box-shadow:
        0 0 18px
        rgba(255,115,87,.4);

      cursor: pointer !important;

      transition:
        transform .2s ease,
        box-shadow .2s ease;
    }


    #${PLAYER_ID} .parijat-control:hover {

      transform: scale(1.08);

      box-shadow:
        0 0 25px
        rgba(255,115,87,.8);
    }


    /* =======================================================
       TRACK INFORMATION
       ======================================================= */

    #${PLAYER_ID} .parijat-track-info {

      width: 100%;

      text-align: center;

      margin-bottom: 18px;

      display: flex;

      flex-direction: column;

      align-items: center;
    }


    #${PLAYER_ID} .parijat-track-title {

      width: 100%;

      color: #ffffff;

      font-family:
        Orbitron,
        Arial,
        sans-serif;

      font-size: 12px;

      letter-spacing: 1.5px;

      text-transform: uppercase;

      line-height: 1.4;

      overflow-wrap: anywhere;

      word-break: break-word;
    }


    #${PLAYER_ID} .parijat-track-artist {

      width: 100%;

      margin-top: 5px;

      color:
        rgba(255,255,255,.55);

      font-family:
        Orbitron,
        Arial,
        sans-serif;

      font-size: 10px;

      letter-spacing: 1px;

      text-transform: uppercase;

      line-height: 1.3;

      overflow-wrap: anywhere;

      word-break: break-word;
    }


    /* =======================================================
       EQUALIZER
       ======================================================= */

    #${PLAYER_ID} .parijat-equalizer {

      display: flex;

      justify-content: center;

      align-items: flex-end;

      gap: 5px;

      height: 34px;

      margin-bottom: 18px;
    }


    #${PLAYER_ID}
      .parijat-equalizer span {

      width: 5px;

      height: 10px;

      border-radius: 20px;

      background:
        #ff7357;

      box-shadow:
        0 0 12px
        rgba(255,115,87,.8);

      animation:
        parijat-equalizer
        1s infinite ease-in-out;

      animation-play-state:
        paused;
    }


    #${PLAYER_ID}
      .parijat-player.playing
      .parijat-equalizer span {

      animation-play-state:
        running;
    }


    #${PLAYER_ID}
      .parijat-equalizer
      span:nth-child(1) {

      animation-delay:
        0s;
    }


    #${PLAYER_ID}
      .parijat-equalizer
      span:nth-child(2) {

      animation-delay:
        .15s;
    }


    #${PLAYER_ID}
      .parijat-equalizer
      span:nth-child(3) {

      animation-delay:
        .30s;
    }


    #${PLAYER_ID}
      .parijat-equalizer
      span:nth-child(4) {

      animation-delay:
        .45s;
    }


    #${PLAYER_ID}
      .parijat-equalizer
      span:nth-child(5) {

      animation-delay:
        .60s;
    }


    @keyframes parijat-equalizer {

      0%,
      100% {
        height: 10px;
      }

      50% {
        height: 34px;
      }
    }


    /* =======================================================
       SEEK BAR
       ======================================================= */

    #${PLAYER_ID} .parijat-seek-row {

      width: 100%;

      display: flex;

      align-items: center;

      gap: 10px;
    }


    #${PLAYER_ID} #parijat-seek {

      flex: 1;

      min-width: 0;

      accent-color:
        #ff7357;

      cursor: pointer;
    }


    /* =======================================================
       VOLUME
       ======================================================= */

    #${PLAYER_ID} .parijat-volume-row {

      width: 100%;

      display: flex;

      align-items: center;

      gap: 12px;

      margin-top: 14px;
    }


    #${PLAYER_ID} #parijat-volume {

      flex: 1;

      min-width: 0;

      accent-color:
        #ff7357;

      cursor: pointer;
    }


    /* =======================================================
       ROUND BUTTONS
       ======================================================= */

    #${PLAYER_ID}
      .parijat-round-button {

      width: 38px;
      height: 38px;

      min-width: 38px;

      padding: 0;

      border: none;

      border-radius: 50%;

      display: flex;

      align-items: center;
      justify-content: center;

      background:
        linear-gradient(
          145deg,
          #ff7357,
          #ff512f
        );

      box-shadow:
        0 0 12px
        rgba(255,115,87,.4);

      cursor: pointer !important;

      transition:
        transform .2s ease,
        box-shadow .2s ease;
    }


    #${PLAYER_ID}
      .parijat-round-button:hover {

      transform: scale(1.08);

      box-shadow:
        0 0 18px
        rgba(255,115,87,.8);
    }


    /* =======================================================
       MINIMIZE BUTTON
       ======================================================= */

    #${PLAYER_ID}
      .parijat-minimize {

      position: absolute;

      top: 7px;
      right: 7px;

      z-index: 5;

      width: 28px;
      height: 28px;

      padding: 0;

      border:
        1px solid
        rgba(255,255,255,.12);

      border-radius: 50%;

      background:
        rgba(20,20,20,.72);

      color: white;

      display: flex;

      align-items: center;
      justify-content: center;

      font:
        700 18px/1
        Arial,
        sans-serif;

      cursor: pointer !important;
    }


    /* =======================================================
       MINIMIZED MODE
       ======================================================= */

    #${PLAYER_ID}.minimized {

      width: 58px;
      height: 58px;

      max-width: 58px;
    }


    #${PLAYER_ID}.minimized
      .parijat-player {

      display: none;
    }


    #${PLAYER_ID}.minimized
      .parijat-minimize {

      display: none;
    }


    #${PLAYER_ID}
      .parijat-bubble {

      display: none;
    }


    #${PLAYER_ID}.minimized
      .parijat-bubble {

      width: 58px;
      height: 58px;

      display: flex;

      align-items: center;
      justify-content: center;

      position: relative;

      padding: 0;

      border:
        1px solid
        rgba(255,115,87,.4);

      border-radius: 50%;

      background:
        linear-gradient(
          145deg,
          #1f1f1f,
          #121212
        );

      color: white;

      font-size: 28px;
      line-height: 1;

      box-sizing: border-box;

      cursor: pointer !important;

      box-shadow:
        0 0 20px
        rgba(255,115,87,.18),

        inset 0 0 20px
        rgba(255,255,255,.03);

      touch-action: none;
    }


    /*
     * Rotating loading ring.
     *
     * Nothing appears beside the bubble.
     * The ring itself rotates around it.
     */

    #${PLAYER_ID}.minimized
      .parijat-bubble::after {

      content: "";

      display: none;

      position: absolute;

      inset: -5px;

      border-radius: 50%;

      background:
        conic-gradient(
          from 0deg,
          transparent 0deg,
          transparent 50deg,
          #ff7357 95deg,
          #ff7357 145deg,
          transparent 190deg,
          transparent 360deg
        );

      -webkit-mask:
        radial-gradient(
          farthest-side,
          transparent calc(100% - 2px),
          #000 calc(100% - 2px)
        );

      mask:
        radial-gradient(
          farthest-side,
          transparent calc(100% - 2px),
          #000 calc(100% - 2px)
        );

      animation:
        parijat-loading-ring
        1s linear infinite;

      pointer-events: none;
    }


    #${PLAYER_ID}.minimized
      .parijat-bubble.playing::after {

      display: block;
    }


    @keyframes parijat-loading-ring {

      from {
        transform:
          rotate(0deg);
      }

      to {
        transform:
          rotate(360deg);
      }
    }


    /* =======================================================
       SMALL SCREENS
       ======================================================= */

    @media (max-width: 768px) {

      #${PLAYER_ID} {

        top: 76px;

        right: 12px;

        width:
          min(
            360px,
            calc(100vw - 24px)
          );

        max-width:
          calc(100vw - 24px);
      }


      #${PLAYER_ID}
        .parijat-control {

        width: 50px;
        height: 50px;
      }
    }
  `;


    /* =========================================================
       CREATE PLAYER
       ========================================================= */

    function createPlayer() {

        if (
            document.getElementById(
                PLAYER_ID
            )
        ) {
            return;
        }


        const style =
            document.createElement(
                "style"
            );

        style.id =
            PLAYER_ID +
            "-style";

        style.textContent =
            PLAYER_CSS;

        document.head.appendChild(
            style
        );


        playerRoot =
            document.createElement(
                "div"
            );

        playerRoot.id =
            PLAYER_ID;

        playerRoot.innerHTML =
            PLAYER_HTML;


        document.body.appendChild(
            playerRoot
        );


        player =
            playerRoot.querySelector(
                ".parijat-player"
            );

        audio =
            playerRoot.querySelector(
                "#parijat-audio"
            );

        prevBtn =
            playerRoot.querySelector(
                "#parijat-prev"
            );

        playBtn =
            playerRoot.querySelector(
                "#parijat-play"
            );

        nextBtn =
            playerRoot.querySelector(
                "#parijat-next"
            );

        seekbar =
            playerRoot.querySelector(
                "#parijat-seek"
            );

        trackTitle =
            playerRoot.querySelector(
                "#parijat-track-title"
            );

        trackArtist =
            playerRoot.querySelector(
                "#parijat-track-artist"
            );

        muteBtn =
            playerRoot.querySelector(
                "#parijat-mute"
            );

        volumeBar =
            playerRoot.querySelector(
                "#parijat-volume"
            );

        modeBtn =
            playerRoot.querySelector(
                "#parijat-mode"
            );


        /* Minimize control */

        minimizeBtn =
            document.createElement(
                "button"
            );

        minimizeBtn.type =
            "button";

        minimizeBtn.className =
            "parijat-minimize";

        minimizeBtn.textContent =
            "−";

        minimizeBtn.title =
            "Minimize music player";

        minimizeBtn.setAttribute(
            "aria-label",
            "Minimize music player"
        );


        /* Bubble */

        bubble =
            document.createElement(
                "button"
            );

        bubble.type =
            "button";

        bubble.className =
            "parijat-bubble";

        bubble.textContent =
            "🎵";

        bubble.title =
            "Open music player";

        bubble.setAttribute(
            "aria-label",
            "Open music player"
        );


        playerRoot.appendChild(
            minimizeBtn
        );

        playerRoot.appendChild(
            bubble
        );
    }


    /* =========================================================
       TAB TITLE
       ========================================================= */

    function updateTabTitle() {

        if (!trackTitle) {
            return;
        }


        const name =
            trackTitle.textContent.trim();


        if (
            !name ||
            name === "LOADING..." ||
            name === "PLAYLIST EMPTY" ||
            name === "FAILED TO LOAD PLAYLIST"
        ) {

            document.title =
                originalTitle;

            return;
        }


        document.title =
            name +
            " • About Parijat";
    }


    /* =========================================================
       PLAY BUTTON UI
       ========================================================= */

    function updatePlayButton(
        playing
    ) {

        if (playing) {

            playBtn.innerHTML = `
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="white">

          <path
            d="M6 5h4v14H6zm8 0h4v14h-4z"/>
        </svg>
      `;

        } else {

            playBtn.innerHTML = `
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="white">

          <path
            d="M8 5v14l11-7z"/>
        </svg>
      `;
        }


        player.classList.toggle(
            "playing",
            playing
        );


        bubble.classList.toggle(
            "playing",
            playing
        );
    }


    /* =========================================================
       MUTE UI
       ========================================================= */

    function updateMuteButton() {

        const muted =
            audio.muted ||
            audio.volume === 0;


        if (muted) {

            muteBtn.innerHTML = `
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="white">

          <path
            d="M16.5 12L19 14.5L17.5 16L15 13.5L12.5 16L11 14.5L13.5 12L11 9.5L12.5 8L15 10.5L17.5 8L19 9.5zM3 9v6h4l5 5V4L7 9H3z"/>
        </svg>
      `;

        } else {

            muteBtn.innerHTML = `
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="white">

          <path
            d="M3 9v6h4l5 5V4L7 9H3z"/>
        </svg>
      `;
        }
    }


    /* =========================================================
       PLAY MODE UI
       ========================================================= */

    function updateModeButton() {

        if (playMode === 0) {

            modeBtn.innerHTML = `
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="white">

          <path
            d="M17 17H7V14L3 18L7 22V19H19V13H17V17ZM7 7H17V10L21 6L17 2V5H5V11H7V7Z"/>
        </svg>
      `;

        } else if (playMode === 1) {

            modeBtn.innerHTML = `
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="white">

          <path
            d="M16 3H21V8H19V6.41L14.12 11.29L12.71 9.88L17.59 5H16V3ZM4 6H6.59L16.17 15.59L14.76 17L5.17 7.41H4V6ZM19 17.59V16H21V21H16V19H17.59L12.71 14.12L14.12 12.71L19 17.59ZM4 18V17H6.59L8.88 14.71L10.29 16.12L8.41 18H4Z"/>
        </svg>
      `;

        } else {

            modeBtn.innerHTML = `
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="white">

          <path
            d="M7 7H17V10L21 6L17 2V5H5V11H7V7ZM17 17H7V14L3 18L7 22V19H19V13H17V17Z"/>

          <circle
            cx="7"
            cy="18"
            r="4"
            fill="white"/>

          <text
            x="7"
            y="20"
            text-anchor="middle"
            font-size="5"
            fill="#ff512f"
            font-family="Arial"
            font-weight="bold">
            1
          </text>

        </svg>
      `;
        }
    }


    /* =========================================================
       SAVE PLAYER STATE
       ========================================================= */

    function saveState() {

        if (!audio) {
            return;
        }


        try {

            localStorage.setItem(
                STORAGE.track,
                String(currentTrack)
            );


            /*
             * Exact current time.
             */
            localStorage.setItem(
                STORAGE.time,
                String(
                    audio.currentTime || 0
                )
            );


            localStorage.setItem(
                STORAGE.volume,
                String(
                    audio.volume
                )
            );


            localStorage.setItem(
                STORAGE.muted,
                String(
                    audio.muted
                )
            );


            /*
             * Save desired playback state,
             * not merely whether playback happened
             * to succeed on this particular load.
             */
            localStorage.setItem(
                STORAGE.playing,
                String(
                    shouldBePlaying
                )
            );


            localStorage.setItem(
                STORAGE.mode,
                String(playMode)
            );


            localStorage.setItem(
                STORAGE.display,
                String(displayMode)
            );

        } catch (error) {

            console.warn(
                "[Cyber Player] Could not save state:",
                error
            );
        }
    }


    /* =========================================================
       SAVE POSITION
       ========================================================= */

    function savePosition() {

        if (
            !playerRoot ||
            isSmallScreen()
        ) {
            return;
        }


        const rect =
            playerRoot.getBoundingClientRect();


        localStorage.setItem(
            STORAGE.left,
            String(
                Math.round(
                    rect.left
                )
            )
        );


        localStorage.setItem(
            STORAGE.top,
            String(
                Math.round(
                    rect.top
                )
            )
        );
    }


    /* =========================================================
       RESTORE POSITION
       ========================================================= */

    function restorePosition() {

        if (
            !playerRoot ||
            isSmallScreen()
        ) {
            return;
        }


        const savedLeft =
            readNumber(
                STORAGE.left,
                NaN
            );


        const savedTop =
            readNumber(
                STORAGE.top,
                NaN
            );


        if (
            Number.isFinite(
                savedLeft
            ) &&
            Number.isFinite(
                savedTop
            )
        ) {

            playerRoot.style.left =
                savedLeft + "px";

            playerRoot.style.top =
                savedTop + "px";

            playerRoot.style.right =
                "auto";

        } else {

            /*
             * First ever visit:
             * top-right corner.
             */

            playerRoot.style.left =
                "auto";

            playerRoot.style.top =
                "85px";

            playerRoot.style.right =
                "32px";
        }


        clampPlayerPosition();
    }


    /* =========================================================
       BOUNDARY CHECK
       ========================================================= */

    function clampPlayerPosition() {

        if (
            !playerRoot ||
            isSmallScreen()
        ) {
            return;
        }


        const rect =
            playerRoot.getBoundingClientRect();


        const maxLeft =
            Math.max(
                VIEWPORT_MARGIN,
                window.innerWidth -
                rect.width -
                VIEWPORT_MARGIN
            );


        const maxTop =
            Math.max(
                VIEWPORT_MARGIN,
                window.innerHeight -
                rect.height -
                VIEWPORT_MARGIN
            );


        const left =
            clamp(
                rect.left,
                VIEWPORT_MARGIN,
                maxLeft
            );


        const top =
            clamp(
                rect.top,
                VIEWPORT_MARGIN,
                maxTop
            );


        playerRoot.style.left =
            left + "px";

        playerRoot.style.top =
            top + "px";

        playerRoot.style.right =
            "auto";
    }


    /* =========================================================
       SAFE EXPANSION
       ========================================================= */

    function expandPlayer() {

        if (
            !playerRoot ||
            isSmallScreen()
        ) {
            return;
        }


        const bubbleRect =
            playerRoot.getBoundingClientRect();


        /*
         * Keep the bubble's current location
         * as the anchor.
         */

        const desiredLeft =
            bubbleRect.left;


        const desiredTop =
            bubbleRect.top;


        /*
         * Temporarily show the full player,
         * but keep it invisible.
         */

        playerRoot.classList.remove(
            "minimized"
        );


        playerRoot.style.visibility =
            "hidden";

        playerRoot.style.left =
            desiredLeft + "px";

        playerRoot.style.top =
            desiredTop + "px";

        playerRoot.style.right =
            "auto";


        requestAnimationFrame(
            function () {

                const rect =
                    playerRoot.getBoundingClientRect();


                /*
                 * Calculate the clear visible area.
                 */

                const maxLeft =
                    Math.max(
                        VIEWPORT_MARGIN,
                        window.innerWidth -
                        rect.width -
                        VIEWPORT_MARGIN
                    );


                const maxTop =
                    Math.max(
                        VIEWPORT_MARGIN,
                        window.innerHeight -
                        rect.height -
                        VIEWPORT_MARGIN
                    );


                const safeLeft =
                    clamp(
                        desiredLeft,
                        VIEWPORT_MARGIN,
                        maxLeft
                    );


                const safeTop =
                    clamp(
                        desiredTop,
                        VIEWPORT_MARGIN,
                        maxTop
                    );


                /*
                 * Position FIRST.
                 * Render SECOND.
                 */

                playerRoot.style.left =
                    safeLeft + "px";

                playerRoot.style.top =
                    safeTop + "px";


                playerRoot.style.visibility =
                    "visible";


                displayMode =
                    "expanded";


                savePosition();
                saveState();
            }
        );
    }


    /* =========================================================
       MINIMIZE / EXPAND
       ========================================================= */

    function minimizePlayer() {

        displayMode =
            "minimized";


        playerRoot.classList.add(
            "minimized"
        );


        clampPlayerPosition();

        savePosition();
        saveState();
    }


    /* =========================================================
       PLAYBACK
       ========================================================= */

    async function playAudio() {

        shouldBePlaying =
            true;


        try {

            await audio.play();

            updatePlayButton(
                true
            );

            updateTabTitle();

            saveState();

        } catch (error) {

            /*
             * Autoplay may be blocked.
             *
             * We deliberately DO NOT change
             * shouldBePlaying back to false.
             *
             * The user's desired state remains
             * "playing" and can be resumed after
             * their first interaction.
             */

            console.warn(
                "[Cyber Player] Browser blocked autoplay:",
                error
            );

            updatePlayButton(
                false
            );

            saveState();
        }
    }


    function pauseAudio() {

        shouldBePlaying =
            false;

        audio.pause();

        updatePlayButton(
            false
        );

        saveState();
    }


    /* =========================================================
       TRACK LOADING
       ========================================================= */

    function loadTrack(
        index,
        restoreSavedTime
    ) {

        if (
            !tracks.length
        ) {
            return;
        }


        currentTrack =
            clamp(
                index,
                0,
                tracks.length - 1
            );


        const track =
            tracks[currentTrack];


        audio.pause();


        audio.src =
            track.src;


        trackTitle.textContent =
            track.title ||
            "UNTITLED";


        trackArtist.textContent =
            track.artist ||
            "";


        updateTabTitle();


        seekbar.value =
            "0";


        /*
         * Only restore the saved time when
         * this is page initialization.
         *
         * Normal next/previous actions start
         * the new track from zero.
         */

        if (
            restoreSavedTime
        ) {

            const savedTime =
                Math.max(
                    0,
                    readNumber(
                        STORAGE.time,
                        0
                    )
                );


            function restoreTime() {

                if (
                    !Number.isFinite(
                        audio.duration
                    ) ||
                    audio.duration <= 0
                ) {
                    return;
                }


                audio.currentTime =
                    Math.min(
                        savedTime,
                        Math.max(
                            0,
                            audio.duration - 0.01
                        )
                    );


                seekbar.value =
                    String(
                        (
                            audio.currentTime /
                            audio.duration
                        ) * 100
                    );
            }


            if (
                audio.readyState >= 1
            ) {

                restoreTime();

            } else {

                audio.addEventListener(
                    "loadedmetadata",
                    restoreTime,
                    {
                        once: true
                    }
                );
            }
        }
    }


    /* =========================================================
       NEXT
       ========================================================= */

    function nextTrack() {

        if (
            !tracks.length
        ) {
            return;
        }


        if (
            playMode === 1 &&
            tracks.length > 1
        ) {

            let next =
                currentTrack;


            while (
                next === currentTrack
            ) {

                next =
                    Math.floor(
                        Math.random() *
                        tracks.length
                    );
            }


            currentTrack =
                next;

        } else {

            currentTrack =
                (
                    currentTrack + 1
                ) %
                tracks.length;
        }


        loadTrack(
            currentTrack,
            false
        );


        playAudio();
    }


    /* =========================================================
       PREVIOUS
       ========================================================= */

    function previousTrack() {

        if (
            !tracks.length
        ) {
            return;
        }


        currentTrack =
            currentTrack <= 0
                ? tracks.length - 1
                : currentTrack - 1;


        loadTrack(
            currentTrack,
            false
        );


        playAudio();
    }


    /* =========================================================
       MODE
       ========================================================= */

    function cycleMode() {

        playMode =
            (
                playMode + 1
            ) % 3;


        updateModeButton();
        saveState();
    }


    /* =========================================================
       EVENTS
       ========================================================= */

    function bindEvents() {

        /* Play / pause */

        playBtn.addEventListener(
            "click",
            function () {

                if (
                    audio.paused
                ) {

                    playAudio();

                } else {

                    pauseAudio();
                }
            }
        );


        /* Next / previous */

        nextBtn.addEventListener(
            "click",
            nextTrack
        );


        prevBtn.addEventListener(
            "click",
            previousTrack
        );


        /* Seek */

        seekbar.addEventListener(
            "input",
            function () {

                if (
                    Number.isFinite(
                        audio.duration
                    ) &&
                    audio.duration > 0
                ) {

                    audio.currentTime =
                        (
                            Number(
                                seekbar.value
                            ) / 100
                        ) *
                        audio.duration;
                }


                saveState();
            }
        );


        /* Volume */

        volumeBar.addEventListener(
            "input",
            function () {

                audio.volume =
                    clamp(
                        Number(
                            volumeBar.value
                        ),
                        0,
                        1
                    );


                if (
                    audio.volume > 0
                ) {

                    audio.muted =
                        false;
                }


                updateMuteButton();
                saveState();
            }
        );


        /* Mute */

        muteBtn.addEventListener(
            "click",
            function () {

                if (
                    audio.muted ||
                    audio.volume === 0
                ) {

                    audio.muted =
                        false;


                    if (
                        audio.volume === 0
                    ) {

                        audio.volume =
                            Math.max(
                                0.01,
                                readNumber(
                                    STORAGE.volume,
                                    1
                                )
                            );

                        volumeBar.value =
                            String(
                                audio.volume
                            );
                    }

                } else {

                    audio.muted =
                        true;
                }


                updateMuteButton();
                saveState();
            }
        );


        /* Mode */

        modeBtn.addEventListener(
            "click",
            cycleMode
        );


        /* Minimize */

        minimizeBtn.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                minimizePlayer();
            }
        );


        /* Expand */

        bubble.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();


                if (
                    dragMoved
                ) {

                    dragMoved =
                        false;

                    return;
                }


                expandPlayer();
            }
        );


        /* Time */

        audio.addEventListener(
            "timeupdate",
            function () {

                if (
                    Number.isFinite(
                        audio.duration
                    ) &&
                    audio.duration > 0
                ) {

                    seekbar.value =
                        String(
                            (
                                audio.currentTime /
                                audio.duration
                            ) * 100
                        );
                }


                saveState();
            }
        );


        /* Playing */

        audio.addEventListener(
            "play",
            function () {

                shouldBePlaying =
                    true;

                updatePlayButton(
                    true
                );

                updateTabTitle();

                saveState();
            }
        );


        /* Paused */

        audio.addEventListener(
            "pause",
            function () {

                updatePlayButton(
                    false
                );

                saveState();
            }
        );


        /* Volume */

        audio.addEventListener(
            "volumechange",
            function () {

                volumeBar.value =
                    String(
                        audio.volume
                    );

                updateMuteButton();

                saveState();
            }
        );


        /* Track ended */

        audio.addEventListener(
            "ended",
            function () {

                if (
                    playMode === 2
                ) {

                    /*
                     * Repeat current track.
                     */

                    const repeatTime =
                        0;

                    audio.currentTime =
                        repeatTime;

                    playAudio();

                    return;
                }


                nextTrack();
            }
        );


        /*
         * When autoplay was blocked, the first
         * interaction with the document retries it.
         */

        document.addEventListener(
            "pointerdown",
            function () {

                if (
                    shouldBePlaying &&
                    audio.paused
                ) {

                    playAudio();
                }
            },
            {
                passive: true
            }
        );


        document.addEventListener(
            "keydown",
            function () {

                if (
                    shouldBePlaying &&
                    audio.paused
                ) {

                    playAudio();
                }
            }
        );


        /* Save while leaving/hiding page */

        document.addEventListener(
            "visibilitychange",
            function () {

                saveState();

                if (
                    document.visibilityState ===
                    "hidden"
                ) {

                    savePosition();
                }
            }
        );


        window.addEventListener(
            "pagehide",
            function () {

                saveState();
                savePosition();
            }
        );


        window.addEventListener(
            "beforeunload",
            function () {

                saveState();
                savePosition();
            }
        );


        /* Resize */

        window.addEventListener(
            "resize",
            function () {

                if (
                    isSmallScreen()
                ) {

                    playerRoot.style.left =
                        "auto";

                    playerRoot.style.right =
                        "12px";

                    playerRoot.style.top =
                        "76px";

                } else {

                    restorePosition();
                }
            }
        );


        /* Drag start */

        playerRoot.addEventListener(
            "pointerdown",
            beginDrag,
            false
        );
    }


    /* =========================================================
       DRAG
       ========================================================= */

    function beginDrag(
        event
    ) {

        if (
            isSmallScreen()
        ) {
            return;
        }


        if (
            event.button !==
            undefined &&
            event.button !== 0
        ) {
            return;
        }


        const target =
            event.target;


        /*
         * Player controls should stay clickable.
         */

        if (
            target.closest(
                "button,input,select,textarea"
            )
        ) {
            return;
        }


        const rect =
            playerRoot.getBoundingClientRect();


        dragging =
            true;

        dragMoved =
            false;

        pointerId =
            event.pointerId;


        dragStartPointerX =
            event.clientX;

        dragStartPointerY =
            event.clientY;


        dragStartLeft =
            rect.left;

        dragStartTop =
            rect.top;


        playerRoot.classList.add(
            "dragging"
        );


        document.addEventListener(
            "pointermove",
            dragMove,
            true
        );


        document.addEventListener(
            "pointerup",
            dragEnd,
            true
        );


        document.addEventListener(
            "pointercancel",
            dragEnd,
            true
        );


        event.preventDefault();
    }


    function dragMove(
        event
    ) {

        if (
            !dragging ||
            event.pointerId !==
            pointerId
        ) {
            return;
        }


        const deltaX =
            event.clientX -
            dragStartPointerX;


        const deltaY =
            event.clientY -
            dragStartPointerY;


        if (
            Math.abs(deltaX) > 3 ||
            Math.abs(deltaY) > 3
        ) {

            dragMoved =
                true;
        }


        const width =
            playerRoot.offsetWidth;


        const height =
            playerRoot.offsetHeight;


        const maxLeft =
            Math.max(
                VIEWPORT_MARGIN,
                window.innerWidth -
                width -
                VIEWPORT_MARGIN
            );


        const maxTop =
            Math.max(
                VIEWPORT_MARGIN,
                window.innerHeight -
                height -
                VIEWPORT_MARGIN
            );


        const left =
            clamp(
                dragStartLeft +
                deltaX,
                VIEWPORT_MARGIN,
                maxLeft
            );


        const top =
            clamp(
                dragStartTop +
                deltaY,
                VIEWPORT_MARGIN,
                maxTop
            );


        playerRoot.style.left =
            left + "px";

        playerRoot.style.top =
            top + "px";

        playerRoot.style.right =
            "auto";
    }


    function dragEnd(
        event
    ) {

        if (
            !dragging
        ) {
            return;
        }


        if (
            event.pointerId !==
            undefined &&
            event.pointerId !==
            pointerId
        ) {
            return;
        }


        dragging =
            false;

        pointerId =
            null;


        playerRoot.classList.remove(
            "dragging"
        );


        document.removeEventListener(
            "pointermove",
            dragMove,
            true
        );


        document.removeEventListener(
            "pointerup",
            dragEnd,
            true
        );


        document.removeEventListener(
            "pointercancel",
            dragEnd,
            true
        );


        savePosition();
        saveState();
    }


    /* =========================================================
       RESTORE EVERYTHING
       ========================================================= */

    function restoreState() {

        /*
         * Track.
         */

        const savedTrack =
            Math.max(
                0,
                Math.min(
                    readNumber(
                        STORAGE.track,
                        0
                    ),
                    Math.max(
                        0,
                        tracks.length - 1
                    )
                )
            );


        currentTrack =
            savedTrack;


        /*
         * Mode.
         */

        playMode =
            clamp(
                readNumber(
                    STORAGE.mode,
                    0
                ),
                0,
                2
            );


        /*
         * Volume.
         */

        const savedVolume =
            clamp(
                readNumber(
                    STORAGE.volume,
                    1
                ),
                0,
                1
            );


        audio.volume =
            savedVolume;


        volumeBar.value =
            String(
                savedVolume
            );


        /*
         * Mute.
         */

        audio.muted =
            localStorage.getItem(
                STORAGE.muted
            ) === "true";


        /*
         * Desired playback state.
         */

        shouldBePlaying =
            localStorage.getItem(
                STORAGE.playing
            ) === "true";


        /*
         * Display state.
         */

        displayMode =
            localStorage.getItem(
                STORAGE.display
            ) === "minimized"
                ? "minimized"
                : "expanded";


        updateMuteButton();
        updateModeButton();


        /*
         * Position.
         */

        if (
            !isSmallScreen()
        ) {

            restorePosition();
        }


        /*
         * Restore display mode.
         */

        if (
            displayMode ===
            "minimized" &&
            !isSmallScreen()
        ) {

            playerRoot.classList.add(
                "minimized"
            );

        } else {

            playerRoot.classList.remove(
                "minimized"
            );

            displayMode =
                "expanded";
        }
    }


    /* =========================================================
       LOAD PLAYLIST
       ========================================================= */

    async function loadPlaylist() {

        try {

            const response =
                await fetch(
                    PLAYLIST_URL,
                    {
                        cache: "no-cache"
                    }
                );


            if (
                !response.ok
            ) {

                throw new Error(
                    "Playlist HTTP " +
                    response.status
                );
            }


            const data =
                await response.json();


            if (
                !Array.isArray(
                    data
                )
            ) {

                throw new Error(
                    "Playlist is not an array"
                );
            }


            tracks =
                data
                    .map(
                        function (track) {

                            return {

                                title:
                                    String(
                                        track?.title ||
                                        "UNTITLED"
                                    ),

                                artist:
                                    String(
                                        track?.artist ||
                                        ""
                                    ),

                                src:
                                    String(
                                        track?.src ||
                                        ""
                                    )
                            };
                        }
                    )
                    .filter(
                        function (track) {

                            return !!track.src;
                        }
                    );


            if (
                !tracks.length
            ) {

                trackTitle.textContent =
                    "PLAYLIST EMPTY";

                return;
            }


            /*
             * Clamp the saved track to the
             * current playlist length.
             */

            currentTrack =
                clamp(
                    readNumber(
                        STORAGE.track,
                        0
                    ),
                    0,
                    tracks.length - 1
                );


            loadTrack(
                currentTrack,
                true
            );


            restoreState();


            /*
             * restoreState() may have loaded the
             * display mode before track metadata
             * was available, so make sure the UI
             * reflects it now.
             */

            updateMuteButton();
            updateModeButton();


            if (
                displayMode ===
                "minimized" &&
                !isSmallScreen()
            ) {

                playerRoot.classList.add(
                    "minimized"
                );
            }


            /*
             * Restore requested playback state.
             */

            if (
                shouldBePlaying
            ) {

                /*
                 * Wait a moment for audio metadata/
                 * layout, then attempt playback.
                 */

                setTimeout(
                    function () {

                        playAudio();

                    },
                    0
                );

            } else {

                audio.pause();

                updatePlayButton(
                    false
                );
            }

        } catch (error) {

            console.error(
                "[Cyber Player] Playlist error:",
                error
            );

            trackTitle.textContent =
                "FAILED TO LOAD PLAYLIST";
        }
    }


    /* =========================================================
       INITIALIZATION
       ========================================================= */

    function init() {

        if (
            document.getElementById(
                PLAYER_ID
            )
        ) {
            return;
        }


        createPlayer();


        if (
            !playerRoot ||
            !player ||
            !audio
        ) {

            console.error(
                "[Cyber Player] Player creation failed."
            );

            return;
        }


        bindEvents();


        updateMuteButton();
        updateModeButton();
        updatePlayButton(false);


        /*
         * The player is created BEFORE
         * playlist/network work begins.
         */

        loadPlaylist();


        /*
         * Save the exact state frequently,
         * especially the playback position.
         */

        setInterval(
            saveState,
            250
        );
    }


    /* =========================================================
       START
       ========================================================= */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init,
            {
                once: true
            }
        );

    } else {

        init();
    }

})();