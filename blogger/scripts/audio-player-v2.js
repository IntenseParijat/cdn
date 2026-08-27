(function () {
    "use strict";

    const PLAYER_ID = "parijat-floating-player";
    const PLAYLIST_URL =
        "https://cdn.jsdelivr.net/gh/IntenseParijat/cdn@main/blogger/scripts/playlist.json";

    const MOBILE_BREAKPOINT = 768;
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

    let tracks = [];
    let currentTrack = 0;
    let playMode = 0;
    let displayMode = "expanded";
    let shouldBePlaying = false;

    let originalTitle = document.title;

    let dragging = false;
    let dragMoved = false;
    let dragPointerId = null;

    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartLeft = 0;
    let dragStartTop = 0;

    function isMobile() {
        return window.innerWidth <= MOBILE_BREAKPOINT;
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(value, max));
    }

    function readNumber(key, fallback) {
        const value = Number(localStorage.getItem(key));
        return Number.isFinite(value) ? value : fallback;
    }

    function updateTabTitle() {
        if (!trackTitle) return;

        const name = trackTitle.textContent.trim();

        if (
            !name ||
            name === "LOADING..." ||
            name === "PLAYLIST EMPTY" ||
            name === "FAILED TO LOAD PLAYLIST"
        ) {
            document.title = originalTitle;
            return;
        }

        document.title = name + " • About Parijat";
    }

    function saveState() {
        if (!audio) return;

        try {
            localStorage.setItem(
                STORAGE.track,
                String(currentTrack)
            );

            localStorage.setItem(
                STORAGE.time,
                String(audio.currentTime || 0)
            );

            localStorage.setItem(
                STORAGE.volume,
                String(audio.volume)
            );

            localStorage.setItem(
                STORAGE.muted,
                String(audio.muted)
            );

            localStorage.setItem(
                STORAGE.playing,
                String(shouldBePlaying)
            );

            localStorage.setItem(
                STORAGE.mode,
                String(playMode)
            );

            localStorage.setItem(
                STORAGE.display,
                displayMode
            );
        } catch (_) { }
    }

    function savePosition() {
        if (!playerRoot || isMobile()) return;

        const rect = playerRoot.getBoundingClientRect();

        localStorage.setItem(
            STORAGE.left,
            String(Math.round(rect.left))
        );

        localStorage.setItem(
            STORAGE.top,
            String(Math.round(rect.top))
        );
    }

    function applyPosition(left, top) {
        if (!playerRoot) return;

        const rect = playerRoot.getBoundingClientRect();

        const maxLeft = Math.max(
            VIEWPORT_MARGIN,
            window.innerWidth - rect.width - VIEWPORT_MARGIN
        );

        const maxTop = Math.max(
            VIEWPORT_MARGIN,
            window.innerHeight - rect.height - VIEWPORT_MARGIN
        );

        const safeLeft = clamp(
            left,
            VIEWPORT_MARGIN,
            maxLeft
        );

        const safeTop = clamp(
            top,
            VIEWPORT_MARGIN,
            maxTop
        );

        playerRoot.style.left = safeLeft + "px";
        playerRoot.style.top = safeTop + "px";
        playerRoot.style.right = "auto";
    }

    function clampPlayerPosition() {
        if (!playerRoot || isMobile()) return;

        const rect = playerRoot.getBoundingClientRect();

        applyPosition(
            rect.left,
            rect.top
        );
    }

    function restorePosition() {
        if (!playerRoot) return;

        if (isMobile()) {
            playerRoot.style.position = "relative";
            playerRoot.style.left = "auto";
            playerRoot.style.top = "auto";
            playerRoot.style.right = "auto";
            return;
        }

        const savedLeft =
            Number(localStorage.getItem(STORAGE.left));

        const savedTop =
            Number(localStorage.getItem(STORAGE.top));

        if (
            Number.isFinite(savedLeft) &&
            Number.isFinite(savedTop)
        ) {
            playerRoot.style.position = "fixed";
            playerRoot.style.left = savedLeft + "px";
            playerRoot.style.top = savedTop + "px";
            playerRoot.style.right = "auto";

            clampPlayerPosition();
        } else {
            playerRoot.style.position = "fixed";
            playerRoot.style.left = "auto";
            playerRoot.style.top = "85px";
            playerRoot.style.right = "32px";
        }
    }

    function movePlayerToCurrentContainer() {
        if (!playerRoot) return;

        const sidebar =
            document.querySelector(".sidebar-container");

        if (isMobile()) {
            if (
                sidebar &&
                playerRoot.parentElement !== sidebar
            ) {
                sidebar.appendChild(playerRoot);
            }

            playerRoot.style.position = "relative";
            playerRoot.style.left = "auto";
            playerRoot.style.top = "auto";
            playerRoot.style.right = "auto";

            return;
        }

        if (
            playerRoot.parentElement !== document.body
        ) {
            document.body.appendChild(playerRoot);
        }

        playerRoot.style.position = "fixed";
    }

    function syncResponsiveState() {
        movePlayerToCurrentContainer();

        if (isMobile()) {
            playerRoot.classList.remove("minimized");
            playerRoot.style.visibility = "visible";
            displayMode = "expanded";
            return;
        }

        restorePosition();

        const savedDisplay =
            localStorage.getItem(
                STORAGE.display
            );

        displayMode =
            savedDisplay === "minimized"
                ? "minimized"
                : "expanded";

        playerRoot.classList.toggle(
            "minimized",
            displayMode === "minimized"
        );

        playerRoot.style.visibility = "visible";
    }

    function updatePlayButton(playing) {
        playBtn.innerHTML = playing
            ? `
        <svg viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="white">
          <path d="M6 5h4v14H6zm8 0h4v14h-4z"/>
        </svg>
      `
            : `
        <svg viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="white">
          <path d="M8 5v14l11-7z"/>
        </svg>
      `;

        player.classList.toggle(
            "playing",
            playing
        );

        bubble.classList.toggle(
            "playing",
            playing
        );
    }

    function updateMuteButton() {
        const muted =
            audio.muted ||
            audio.volume === 0;

        muteBtn.innerHTML = muted
            ? `
        <svg viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="white">
          <path d="M16.5 12L19 14.5L17.5 16L15 13.5L12.5 16L11 14.5L13.5 12L11 9.5L12.5 8L15 10.5L17.5 8L19 9.5zM3 9v6h4l5 5V4L7 9H3z"/>
        </svg>
      `
            : `
        <svg viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="white">
          <path d="M3 9v6h4l5 5V4L7 9H3z"/>
        </svg>
      `;
    }

    function updateModeButton() {
        const icons = [
            `
        <svg viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="white">
          <path d="M17 17H7V14L3 18L7 22V19H19V13H17V17ZM7 7H17V10L21 6L17 2V5H5V11H7V7Z"/>
        </svg>
      `,
            `
        <svg viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="white">
          <path d="M16 3H21V8H19V6.41L14.12 11.29L12.71 9.88L17.59 5H16V3ZM4 6H6.59L16.17 15.59L14.76 17L5.17 7.41H4V6ZM19 17.59V16H21V21H16V19H17.59L12.71 14.12L14.12 12.71L19 17.59ZM4 18V17H6.59L8.88 14.71L10.29 16.12L8.41 18H4Z"/>
        </svg>
      `,
            `
        <svg viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="white">
          <path d="M7 7H17V10L21 6L17 2V5H5V11H7V7ZM17 17H7V14L3 18L7 22V19H19V13H17V17Z"/>
          <circle cx="7" cy="18" r="4" fill="white"/>
          <text x="7" y="20"
            text-anchor="middle"
            font-size="5"
            fill="#ff512f"
            font-family="Arial"
            font-weight="bold">1</text>
        </svg>
      `
        ];

        modeBtn.innerHTML =
            icons[playMode];
    }

    function createPlayer() {
        if (
            document.getElementById(
                PLAYER_ID
            )
        ) {
            return;
        }

        const style =
            document.createElement("style");

        style.id =
            PLAYER_ID + "-styles";

        style.textContent = `
      #${PLAYER_ID} {
        position: fixed;
        top: 85px;
        right: 32px;
        left: auto;
        width: 360px;
        max-width: calc(100vw - 24px);
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
        transition: opacity .4s ease;
        pointer-events: none;
      }

      #${PLAYER_ID}
        .parijat-player.playing
        .parijat-glow {
        opacity: 1;
      }

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

      #${PLAYER_ID}
        .parijat-control:hover {
        transform: scale(1.08);
        box-shadow:
          0 0 25px
          rgba(255,115,87,.8);
      }

      #${PLAYER_ID}
        .parijat-track-info {
        width: 100%;
        text-align: center;
        margin-bottom: 18px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      #${PLAYER_ID}
        .parijat-track-title {
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

      #${PLAYER_ID}
        .parijat-track-artist {
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

      #${PLAYER_ID}
        .parijat-equalizer {
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
        background: #ff7357;
        box-shadow:
          0 0 12px
          rgba(255,115,87,.8);
        animation:
          parijat-equalizer
          1s infinite ease-in-out;
        animation-play-state: paused;
      }

      #${PLAYER_ID}
        .parijat-player.playing
        .parijat-equalizer span {
        animation-play-state: running;
      }

      #${PLAYER_ID}
        .parijat-equalizer
        span:nth-child(1) {
        animation-delay: 0s;
      }

      #${PLAYER_ID}
        .parijat-equalizer
        span:nth-child(2) {
        animation-delay: .15s;
      }

      #${PLAYER_ID}
        .parijat-equalizer
        span:nth-child(3) {
        animation-delay: .30s;
      }

      #${PLAYER_ID}
        .parijat-equalizer
        span:nth-child(4) {
        animation-delay: .45s;
      }

      #${PLAYER_ID}
        .parijat-equalizer
        span:nth-child(5) {
        animation-delay: .60s;
      }

      @keyframes parijat-equalizer {
        0%,100% {
          height: 10px;
        }
        50% {
          height: 34px;
        }
      }

      #${PLAYER_ID}
        .parijat-seek-row {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 10px;
      }

      #${PLAYER_ID}
        #parijat-seek {
        flex: 1;
        min-width: 0;
        accent-color: #ff7357;
        cursor: pointer;
      }

      #${PLAYER_ID}
        .parijat-volume-row {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 14px;
      }

      #${PLAYER_ID}
        #parijat-volume {
        flex: 1;
        min-width: 0;
        accent-color: #ff7357;
        cursor: pointer;
      }

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

      #${PLAYER_ID}
        .parijat-bubble {
        display: none;
      }

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
        cursor: grab !important;
        box-sizing: border-box;
        box-shadow:
          0 0 20px
          rgba(255,115,87,.18),
          inset 0 0 20px
          rgba(255,255,255,.03);
        touch-action: none;
      }

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
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      @media (max-width: 768px) {

        #${PLAYER_ID} {
          position: relative !important;
          top: auto !important;
          left: auto !important;
          right: auto !important;
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
          z-index: auto !important;
          cursor: default !important;
          touch-action: auto !important;
        }

        #${PLAYER_ID}
          .parijat-player {
          width:
            calc(100% - 32px);
          max-width: 360px;
          margin: 20px auto;
        }

        #${PLAYER_ID}
          .parijat-minimize,
        #${PLAYER_ID}
          .parijat-bubble {
          display: none !important;
        }
      }
    `;

        document.head.appendChild(style);

        playerRoot =
            document.createElement("div");

        playerRoot.id =
            PLAYER_ID;

        playerRoot.innerHTML = `
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
            class="parijat-track-title"
            id="parijat-track-title">
            LOADING...
          </div>

          <div
            class="parijat-track-artist"
            id="parijat-track-artist">
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

        minimizeBtn =
            document.createElement("button");

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

        bubble =
            document.createElement("button");

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

        document.body.appendChild(
            playerRoot
        );
    }

    function loadTrack(
        index,
        restoreTime
    ) {
        if (!tracks.length) return;

        currentTrack = clamp(
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

        seekbar.value =
            "0";

        updateTabTitle();

        if (!restoreTime) return;

        const savedTime =
            Math.max(
                0,
                readNumber(
                    STORAGE.time,
                    0
                )
            );

        const restore =
            function () {

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
            };

        if (
            audio.readyState >= 1
        ) {
            restore();
        } else {
            audio.addEventListener(
                "loadedmetadata",
                restore,
                {
                    once: true
                }
            );
        }
    }

    async function loadPlaylist() {
        try {
            const response =
                await fetch(
                    PLAYLIST_URL,
                    {
                        cache: "no-cache"
                    }
                );

            if (!response.ok) {
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

            if (!tracks.length) {
                trackTitle.textContent =
                    "PLAYLIST EMPTY";
                return;
            }

            currentTrack =
                clamp(
                    readNumber(
                        STORAGE.track,
                        0
                    ),
                    0,
                    tracks.length - 1
                );

            playMode =
                clamp(
                    readNumber(
                        STORAGE.mode,
                        0
                    ),
                    0,
                    2
                );

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

            audio.muted =
                localStorage.getItem(
                    STORAGE.muted
                ) === "true";

            volumeBar.value =
                String(
                    savedVolume
                );

            shouldBePlaying =
                localStorage.getItem(
                    STORAGE.playing
                ) === "true";

            displayMode =
                localStorage.getItem(
                    STORAGE.display
                ) === "minimized"
                    ? "minimized"
                    : "expanded";

            loadTrack(
                currentTrack,
                true
            );

            updateMuteButton();
            updateModeButton();

            if (
                !isMobile()
            ) {

                restorePosition();

                playerRoot.classList.toggle(
                    "minimized",
                    displayMode ===
                    "minimized"
                );
            } else {

                displayMode =
                    "expanded";

                playerRoot.classList.remove(
                    "minimized"
                );
            }

            updateBubbleState();

            if (
                shouldBePlaying
            ) {
                await tryPlay();
            } else {
                updatePlayButton(
                    false
                );
            }

        } catch (error) {

            console.error(
                "[Cyber Player]",
                error
            );

            trackTitle.textContent =
                "FAILED TO LOAD PLAYLIST";
        }
    }

    async function tryPlay() {
        try {
            await audio.play();

            shouldBePlaying =
                true;

            updatePlayButton(
                true
            );

            updateTabTitle();

            saveState();

        } catch (error) {

            updatePlayButton(
                false
            );

            saveState();
        }
    }

    async function playAudio() {

        shouldBePlaying =
            true;

        await tryPlay();
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

    function nextTrack() {

        if (!tracks.length) return;

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

    function previousTrack() {

        if (!tracks.length) return;

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

    function updateVolume() {

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

    function toggleMute() {

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

    function cycleMode() {

        playMode =
            (
                playMode + 1
            ) % 3;

        updateModeButton();
        saveState();
    }

    function minimizePlayer() {

        if (isMobile()) {
            return;
        }

        displayMode =
            "minimized";

        playerRoot.classList.add(
            "minimized"
        );

        clampPlayerPosition();
        savePosition();
        saveState();
    }

    function expandPlayer() {

        if (isMobile()) {
            return;
        }

        const bubbleRect =
            playerRoot.getBoundingClientRect();

        const desiredLeft =
            bubbleRect.left;

        const desiredTop =
            bubbleRect.top;

        playerRoot.classList.remove(
            "minimized"
        );

        playerRoot.style.visibility =
            "hidden";

        playerRoot.style.position =
            "fixed";

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
                        desiredLeft,
                        VIEWPORT_MARGIN,
                        maxLeft
                    );

                const top =
                    clamp(
                        desiredTop,
                        VIEWPORT_MARGIN,
                        maxTop
                    );

                playerRoot.style.left =
                    left + "px";

                playerRoot.style.top =
                    top + "px";

                playerRoot.style.visibility =
                    "visible";

                displayMode =
                    "expanded";

                savePosition();
                saveState();
            }
        );
    }

    function beginDrag(event) {

        if (
            isMobile()
        ) {
            return;
        }

        if (
            event.button !== undefined &&
            event.button !== 0
        ) {
            return;
        }

        const target =
            event.target;

        const clickedBubble =
            target.closest(
                ".parijat-bubble"
            );

        if (
            !clickedBubble &&
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

        dragPointerId =
            event.pointerId;

        dragStartX =
            event.clientX;

        dragStartY =
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

    function dragMove(event) {

        if (
            !dragging ||
            event.pointerId !==
            dragPointerId
        ) {
            return;
        }

        const deltaX =
            event.clientX -
            dragStartX;

        const deltaY =
            event.clientY -
            dragStartY;

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

    function dragEnd(event) {

        if (!dragging) {
            return;
        }

        if (
            event.pointerId !==
            undefined &&
            event.pointerId !==
            dragPointerId
        ) {
            return;
        }

        dragging =
            false;

        dragPointerId =
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

        if (
            dragMoved &&
            bubble &&
            playerRoot.classList.contains(
                "minimized"
            )
        ) {

            bubble.dataset.dragged =
                "true";

            setTimeout(
                function () {
                    delete bubble.dataset.dragged;
                },
                100
            );
        }
    }

    function bindEvents() {

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

        nextBtn.addEventListener(
            "click",
            nextTrack
        );

        prevBtn.addEventListener(
            "click",
            previousTrack
        );

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

        volumeBar.addEventListener(
            "input",
            updateVolume
        );

        muteBtn.addEventListener(
            "click",
            toggleMute
        );

        modeBtn.addEventListener(
            "click",
            cycleMode
        );

        minimizeBtn.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                minimizePlayer();
            }
        );

        bubble.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                if (
                    bubble.dataset.dragged
                ) {
                    return;
                }

                expandPlayer();
            }
        );

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

        audio.addEventListener(
            "pause",
            function () {

                updatePlayButton(
                    false
                );

                saveState();
            }
        );

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

        audio.addEventListener(
            "ended",
            function () {

                if (
                    playMode === 2
                ) {

                    audio.currentTime =
                        0;

                    playAudio();

                } else {

                    nextTrack();
                }
            }
        );

        playerRoot.addEventListener(
            "pointerdown",
            beginDrag,
            false
        );

        window.addEventListener(
            "resize",
            function () {

                syncResponsiveState();

            }
        );

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
    }

    function init() {

        if (
            document.getElementById(
                PLAYER_ID
            )
        ) {
            return;
        }

        createPlayer();

        movePlayerToCurrentContainer();

        bindEvents();

        updateMuteButton();
        updateModeButton();
        updatePlayButton(false);

        syncResponsiveState();

        loadPlaylist();

        setInterval(
            saveState,
            250
        );
    }

    function start() {

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
    }

    start();

})();