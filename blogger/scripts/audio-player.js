(function () {
    "use strict";

    const DESKTOP_BREAKPOINT = 1620;

    const PLAYLIST_URL =
        "https://cdn.jsdelivr.net/gh/IntenseParijat/cdn@main/blogger/scripts/playlist.json";

    const STORAGE = {
        track: "cyberPlayerTrack",
        time: "cyberPlayerTime",
        volume: "cyberPlayerVolume",
        muted: "cyberPlayerMuted",
        playing: "cyberPlayerPlaying",
        mode: "cyberPlayerMode",
        displayMode: "cyberPlayerDisplayMode",
        left: "floatingMusicPlayerLeft",
        top: "floatingMusicPlayerTop"
    };

    let tracks = [];
    let currentTrack = 0;
    let playMode = 0;

    let audio;
    let playBtn;
    let nextBtn;
    let prevBtn;
    let seekbar;
    let trackTitle;
    let trackArtist;
    let volumeBar;
    let muteBtn;
    let modeBtn;
    let player;
    let widget;

    let bubble;
    let minimizeBtn;

    let originalParent = null;
    let originalNextSibling = null;
    let desktopMoved = false;

    let displayMode = "expanded";
    let originalDocumentTitle = document.title;

    let dragging = false;
    let dragMoved = false;
    let dragPointerId = null;

    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartLeft = 0;
    let dragStartTop = 0;


    /* =========================================================
       HELPERS
       ========================================================= */

    function isDesktop() {
        return window.innerWidth >= DESKTOP_BREAKPOINT;
    }

    function number(value, fallback) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }


    /* =========================================================
       TAB TITLE
       ========================================================= */

    function updateBrowserTitle() {

        const name =
            trackTitle &&
                trackTitle.textContent
                ? trackTitle.textContent.trim()
                : "";

        if (
            !name ||
            name === "LOADING..." ||
            name === "UNKNOWN TRACK" ||
            name === "PLAYLIST EMPTY" ||
            name === "FAILED TO LOAD PLAYLIST"
        ) {
            document.title = originalDocumentTitle;
            return;
        }

        document.title =
            name.toUpperCase() +
            " • About Parijat";
    }


    /* =========================================================
       SAVE COMPLETE PLAYER STATE
       ========================================================= */

    function savePlayerState() {

        if (!audio) {
            return;
        }

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
                String(!audio.paused)
            );

            localStorage.setItem(
                STORAGE.mode,
                String(playMode)
            );

            localStorage.setItem(
                STORAGE.displayMode,
                displayMode
            );

        } catch (error) {
            console.warn(
                "[Cyber Player] State save failed:",
                error
            );
        }
    }


    /* =========================================================
       SAVE FLOATING POSITION
       ========================================================= */

    function savePosition() {

        if (
            !widget ||
            !isDesktop()
        ) {
            return;
        }

        const left =
            parseFloat(widget.style.left);

        const top =
            parseFloat(widget.style.top);

        if (
            Number.isFinite(left) &&
            Number.isFinite(top)
        ) {

            localStorage.setItem(
                STORAGE.left,
                String(left)
            );

            localStorage.setItem(
                STORAGE.top,
                String(top)
            );
        }
    }


    /* =========================================================
       PLAYER UI
       ========================================================= */

    function setPlayingUI(isPlaying) {

        if (!playBtn) {
            return;
        }

        if (isPlaying) {

            playBtn.innerHTML = `
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="white"
        >
          <path d="M6 5h4v14H6zm8 0h4v14h-4z"/>
        </svg>
      `;

        } else {

            playBtn.innerHTML = `
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="white"
        >
          <path d="M8 5v14l11-7z"/>
        </svg>
      `;
        }

        player.classList.toggle(
            "playing",
            isPlaying
        );

        updateBubbleState();
    }


    function updateBubbleState() {

        if (!bubble) {
            return;
        }

        bubble.classList.toggle(
            "is-playing",
            !!audio &&
            !audio.paused
        );
    }


    /* =========================================================
       LOAD TRACK
       ========================================================= */

    function loadTrack(index) {

        if (
            !tracks.length ||
            !audio
        ) {
            return;
        }

        currentTrack =
            Math.max(
                0,
                Math.min(
                    index,
                    tracks.length - 1
                )
            );

        const track =
            tracks[currentTrack];

        audio.src =
            track.src;

        trackTitle.textContent =
            track.title || "UNTITLED";

        trackArtist.textContent =
            track.artist || "";

        updateBrowserTitle();
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

            if (!response.ok) {
                throw new Error(
                    "Playlist request failed: " +
                    response.status
                );
            }

            const playlist =
                await response.json();

            if (!Array.isArray(playlist)) {
                throw new Error(
                    "Playlist JSON is not an array"
                );
            }

            tracks =
                playlist
                    .map(function (track) {
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
                    })
                    .filter(function (track) {
                        return track.src;
                    });

            if (!tracks.length) {

                trackTitle.textContent =
                    "PLAYLIST EMPTY";

                return;
            }

            const savedTrack =
                number(
                    localStorage.getItem(
                        STORAGE.track
                    ),
                    0
                );

            currentTrack =
                Math.max(
                    0,
                    Math.min(
                        savedTrack,
                        tracks.length - 1
                    )
                );

            loadTrack(
                currentTrack
            );

            await restoreCompleteState();

        } catch (error) {

            console.error(
                "[Cyber Player]",
                error
            );

            if (trackTitle) {
                trackTitle.textContent =
                    "FAILED TO LOAD PLAYLIST";
            }
        }
    }


    /* =========================================================
       RESTORE COMPLETE STATE
       ========================================================= */

    async function restoreCompleteState() {

        if (
            !audio ||
            !tracks.length
        ) {
            return;
        }

        const savedTime =
            Math.max(
                0,
                number(
                    localStorage.getItem(
                        STORAGE.time
                    ),
                    0
                )
            );

        const savedVolume =
            Math.max(
                0,
                Math.min(
                    1,
                    number(
                        localStorage.getItem(
                            STORAGE.volume
                        ),
                        1
                    )
                )
            );

        const savedMuted =
            localStorage.getItem(
                STORAGE.muted
            ) === "true";

        const savedPlaying =
            localStorage.getItem(
                STORAGE.playing
            ) === "true";

        playMode =
            Math.max(
                0,
                Math.min(
                    2,
                    number(
                        localStorage.getItem(
                            STORAGE.mode
                        ),
                        0
                    )
                )
            );



        audio.volume =
            savedVolume;

        audio.muted =
            savedMuted;

        volumeBar.value =
            savedVolume;



        const restorePosition =
            function () {

                if (
                    Number.isFinite(
                        audio.duration
                    ) &&
                    audio.duration > 0
                ) {

                    audio.currentTime =
                        Math.min(
                            savedTime,
                            Math.max(
                                0,
                                audio.duration - 0.01
                            )
                        );

                    seekbar.value =
                        (
                            audio.currentTime /
                            audio.duration
                        ) * 100;
                }
            };


        if (
            audio.readyState >= 1
        ) {

            restorePosition();

        } else {

            audio.addEventListener(
                "loadedmetadata",
                restorePosition,
                { once: true }
            );
        }


        updateMuteButton();
        updateModeButton();
        updateBrowserTitle();



        if (savedPlaying) {

            try {

                await audio.play();

                setPlayingUI(
                    true
                );

            } catch (error) {

                console.warn(
                    "[Cyber Player] Browser prevented automatic resume:",
                    error
                );

                setPlayingUI(false);
            }

        } else {

            audio.pause();

            setPlayingUI(
                false
            );
        }


        syncDesktopMode();
    }


    /* =========================================================
       PLAY / PAUSE
       ========================================================= */

    async function playAudio() {

        try {

            await audio.play();

            setPlayingUI(
                true
            );

            savePlayerState();

        } catch (error) {

            console.warn(
                "[Cyber Player] Playback failed:",
                error
            );

            setPlayingUI(
                false
            );
        }
    }


    function pauseAudio() {

        audio.pause();

        setPlayingUI(
            false
        );

        savePlayerState();
    }


    /* =========================================================
       NEXT / PREVIOUS
       ========================================================= */

    function nextTrack() {

        if (!tracks.length) {
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
            currentTrack
        );

        playAudio();
    }


    function previousTrack() {

        if (!tracks.length) {
            return;
        }

        currentTrack =
            currentTrack <= 0
                ? tracks.length - 1
                : currentTrack - 1;

        loadTrack(
            currentTrack
        );

        playAudio();
    }


    /* =========================================================
       VOLUME / MUTE
       ========================================================= */

    function updateMuteButton() {

        if (
            !audio ||
            !muteBtn
        ) {
            return;
        }

        const muted =
            audio.muted ||
            audio.volume === 0;

        muteBtn.innerHTML =
            muted
                ? `
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="white"
          >
            <path d="M16.5 12L19 14.5L17.5 16L15 13.5L12.5 16L11 14.5L13.5 12L11 9.5L12.5 8L15 10.5L17.5 8L19 9.5zM3 9v6h4l5 5V4L7 9H3z"/>
          </svg>
        `
                : `
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="white"
          >
            <path d="M3 9v6h4l5 5V4L7 9H3z"/>
          </svg>
        `;
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

                const previous =
                    number(
                        audio.dataset.previousVolume,
                        1
                    );

                audio.volume =
                    previous > 0
                        ? previous
                        : 1;

                volumeBar.value =
                    audio.volume;
            }

        } else {

            audio.dataset.previousVolume =
                String(
                    audio.volume
                );

            audio.muted =
                true;
        }

        updateMuteButton();
        savePlayerState();
    }


    function updateVolume() {

        audio.volume =
            Math.max(
                0,
                Math.min(
                    1,
                    Number(
                        volumeBar.value
                    )
                )
            );

        audio.muted =
            audio.volume === 0;

        updateMuteButton();
        savePlayerState();
    }


    /* =========================================================
       PLAY MODE
       ========================================================= */

    function updateModeButton() {

        const icons = [

            `
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="white"
        >
          <path d="M17 17H7V14L3 18L7 22V19H19V13H17V17ZM7 7H17V10L21 6L17 2V5H5V11H7V7Z"/>
        </svg>
      `,

            `
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="white"
        >
          <path d="M16 3H21V8H19V6.41L14.12 11.29L12.71 9.88L17.59 5H16V3ZM4 6H6.59L16.17 15.59L14.76 17L5.17 7.41H4V6ZM19 17.59V16H21V21H16V19H17.59L12.71 14.12L14.12 12.71L19 17.59ZM4 18V17H6.59L8.88 14.71L10.29 16.12L8.41 18H4Z"/>
        </svg>
      `,

            `
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="white"
        >
          <path d="M7 7H17V10L21 6L17 2V5H5V11H7V7ZM17 17H7V14L3 18L7 22V19H19V13H17V17Z"/>
          <circle
            cx="7"
            cy="18"
            r="4"
            fill="white"
          />
          <text
            x="7"
            y="20"
            text-anchor="middle"
            font-size="5"
            fill="#ff512f"
            font-family="Arial"
            font-weight="bold"
          >1</text>
        </svg>
      `
        ];

        modeBtn.innerHTML =
            icons[playMode];
    }


    function cyclePlayMode() {

        playMode =
            (playMode + 1) % 3;

        updateModeButton();
        savePlayerState();
    }


    /* =========================================================
       FLOATING PLAYER CSS
       ========================================================= */

    function injectStyles() {

        if (
            document.getElementById(
                "cyber-player-floating-styles"
            )
        ) {
            return;
        }

        const style =
            document.createElement(
                "style"
            );

        style.id =
            "cyber-player-floating-styles";

        style.textContent = `

      @media screen and (min-width: 1620px) {

        #HTML1 {
          position: fixed !important;

          top: 85px;
          right: 32px;
          left: auto;

          width: 280px !important;
          max-width: 280px !important;

          margin: 0 !important;
          padding: 0 !important;

          z-index: 99999 !important;

          overflow: visible !important;

          cursor: grab !important;

          user-select: none !important;
          -webkit-user-select: none !important;

          touch-action: none !important;

          pointer-events: auto !important;
        }


        #HTML1.dragging {
          cursor: grabbing !important;
        }


        #HTML1 .widget-content {
          width: 100% !important;

          margin: 0 !important;
          padding: 0 !important;

          overflow: visible !important;
        }


        #HTML1 #player {
          width: 100% !important;
          max-width: none !important;
        }


        #HTML1 .floating-minimize-btn {

          position: absolute;

          top: 7px;
          right: 7px;

          z-index: 10003;

          width: 28px;
          height: 28px;

          padding: 0;

          border:
            1px solid
            rgba(255,255,255,.12);

          border-radius: 50%;

          background:
            rgba(20,20,20,.72);

          color: #fff;

          font:
            700 18px/26px
            Arial,
            sans-serif;

          cursor: pointer !important;

          display: flex;

          align-items: center;
          justify-content: center;
        }


        #HTML1 .music-player-bubble {
          display: none;
        }


        #HTML1.music-player-floating-minimized {

          width: 58px !important;
          max-width: 58px !important;

          height: 58px !important;
        }


        #HTML1.music-player-floating-minimized #player {
          display: none !important;
        }


        #HTML1.music-player-floating-minimized
          .floating-minimize-btn {

          display: none !important;
        }


        #HTML1.music-player-floating-minimized
          .music-player-bubble {

          position: relative;

          display: flex;

          align-items: center;
          justify-content: center;

          width: 58px;
          height: 58px;

          margin: 0;
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

          color: #fff;

          font-size: 28px;
          line-height: 1;

          cursor: pointer !important;

          box-sizing: border-box;

          box-shadow:
            0 0 20px
            rgba(255,115,87,.18),

            inset 0 0 20px
            rgba(255,255,255,.03);

          touch-action: none;
        }


        #HTML1.music-player-floating-minimized
          .music-player-bubble::after {

          content: "";

          display: none;

          position: absolute;

          inset: -5px;

          border-radius: 50%;

          background:
            conic-gradient(
              from 0deg,

              transparent 0deg,
              transparent 45deg,

              #ff7357 90deg,
              #ff7357 135deg,

              transparent 180deg,
              transparent 360deg
            );

          -webkit-mask:
            radial-gradient(
              farthest-side,

              transparent
              calc(100% - 2px),

              #000
              calc(100% - 2px)
            );

          mask:
            radial-gradient(
              farthest-side,

              transparent
              calc(100% - 2px),

              #000
              calc(100% - 2px)
            );

          animation:
            cyberPlayerLoadingSpin
            1s linear infinite;

          pointer-events: none;
        }


        #HTML1.music-player-floating-minimized
          .music-player-bubble.is-playing::after {

          display: block;
        }


        @keyframes cyberPlayerLoadingSpin {

          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }
      }


      @media screen and (max-width: 1619px) {

        #HTML1 .floating-minimize-btn,
        #HTML1 .music-player-bubble {

          display: none !important;
        }
      }
    `;

        document.head.appendChild(
            style
        );
    }


    /* =========================================================
       CREATE FLOATING CONTROLS
       ========================================================= */

    function setupFloatingElements() {

        injectStyles();


        minimizeBtn =
            document.createElement(
                "button"
            );

        minimizeBtn.type =
            "button";

        minimizeBtn.className =
            "floating-minimize-btn";

        minimizeBtn.setAttribute(
            "aria-label",
            "Minimize music player"
        );

        minimizeBtn.title =
            "Minimize";

        minimizeBtn.textContent =
            "−";


        bubble =
            document.createElement(
                "button"
            );

        bubble.type =
            "button";

        bubble.className =
            "music-player-bubble";

        bubble.setAttribute(
            "aria-label",
            "Open music player"
        );

        bubble.title =
            "Open music player";

        bubble.textContent =
            "🎵";


        widget.appendChild(
            minimizeBtn
        );

        widget.appendChild(
            bubble
        );


        minimizeBtn.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                setDisplayMode(
                    "minimized"
                );
            }
        );


        bubble.addEventListener(
            "click",
            function (event) {

                if (dragMoved) {

                    dragMoved = false;

                    event.preventDefault();
                    event.stopPropagation();

                    return;
                }

                event.preventDefault();
                event.stopPropagation();

                setDisplayMode(
                    "expanded"
                );
            }
        );
    }


    /* =========================================================
       POSITION HELPERS
       ========================================================= */

    function getSavedPosition() {

        const left =
            localStorage.getItem(
                STORAGE.left
            );

        const top =
            localStorage.getItem(
                STORAGE.top
            );

        return {

            left:
                left !== null
                    ? number(left, NaN)
                    : NaN,

            top:
                top !== null
                    ? number(top, NaN)
                    : NaN
        };
    }


    function clampPosition(
        left,
        top
    ) {

        const maxLeft =
            Math.max(
                0,
                window.innerWidth -
                widget.offsetWidth
            );

        const maxTop =
            Math.max(
                0,
                window.innerHeight -
                widget.offsetHeight
            );

        return {

            left:
                Math.max(
                    0,
                    Math.min(
                        left,
                        maxLeft
                    )
                ),

            top:
                Math.max(
                    0,
                    Math.min(
                        top,
                        maxTop
                    )
                )
        };
    }


    function restorePosition() {

        if (!isDesktop()) {
            return;
        }

        const saved =
            getSavedPosition();

        if (
            Number.isFinite(
                saved.left
            ) &&
            Number.isFinite(
                saved.top
            )
        ) {

            const position =
                clampPosition(
                    saved.left,
                    saved.top
                );

            widget.style.left =
                position.left +
                "px";

            widget.style.top =
                position.top +
                "px";

            widget.style.right =
                "auto";

        } else {

            widget.style.left =
                "auto";

            widget.style.top =
                "85px";

            widget.style.right =
                "32px";
        }
    }


    /* =========================================================
       EXPAND WITH BOUNDARY CHECK
       ========================================================= */

    function expandIntoAvailableSpace() {

        if (
            !widget ||
            !isDesktop()
        ) {
            return;
        }


        const rect =
            widget.getBoundingClientRect();

        let left =
            rect.left;

        let top =
            rect.top;



        widget.classList.remove(
            "music-player-floating-minimized"
        );

        widget.style.visibility =
            "hidden";

        widget.style.left =
            left + "px";

        widget.style.top =
            top + "px";

        widget.style.right =
            "auto";


        requestAnimationFrame(
            function () {

                const width =
                    widget.offsetWidth;

                const height =
                    widget.offsetHeight;


                const margin =
                    16;


                const maxLeft =
                    Math.max(
                        margin,
                        window.innerWidth -
                        width -
                        margin
                    );

                const maxTop =
                    Math.max(
                        margin,
                        window.innerHeight -
                        height -
                        margin
                    );


                left =
                    Math.max(
                        margin,
                        Math.min(
                            left,
                            maxLeft
                        )
                    );

                top =
                    Math.max(
                        margin,
                        Math.min(
                            top,
                            maxTop
                        )
                    );


                widget.style.left =
                    left + "px";

                widget.style.top =
                    top + "px";


                widget.style.visibility =
                    "visible";


                displayMode =
                    "expanded";


                savePosition();
                savePlayerState();
            }
        );
    }


    /* =========================================================
       DISPLAY MODE
       ========================================================= */

    function setDisplayMode(mode) {

        if (
            mode === "minimized"
        ) {

            displayMode =
                "minimized";

            if (isDesktop()) {

                widget.classList.add(
                    "music-player-floating-minimized"
                );

                updateBubbleState();

                savePosition();
                savePlayerState();
            }

            return;
        }

        expandIntoAvailableSpace();
    }

    function movePlayerForCurrentViewport() {

        if (!widget) {
            return;
        }

        if (isDesktop()) {

            if (!desktopMoved) {

                originalParent =
                    widget.parentNode;

                originalNextSibling =
                    widget.nextSibling;

                document.body.appendChild(
                    widget
                );

                desktopMoved = true;
            }

            widget.style.position =
                "fixed";

            widget.style.width =
                "360px";

            widget.style.maxWidth =
                "360px";

            widget.style.margin =
                "0";

            widget.style.padding =
                "0";

            widget.style.zIndex =
                "999999";
        }

        else {

            if (
                desktopMoved &&
                originalParent
            ) {

                if (
                    originalNextSibling &&
                    originalNextSibling.parentNode ===
                    originalParent
                ) {

                    originalParent.insertBefore(
                        widget,
                        originalNextSibling
                    );

                } else {

                    originalParent.appendChild(
                        widget
                    );
                }

                desktopMoved =
                    false;

                widget.style.position =
                    "";

                widget.style.left =
                    "";

                widget.style.top =
                    "";

                widget.style.right =
                    "";

                widget.style.width =
                    "";

                widget.style.maxWidth =
                    "";

                widget.style.margin =
                    "";

                widget.style.padding =
                    "";

                widget.style.zIndex =
                    "";
            }
        }
    }


    function syncDesktopMode() {

        movePlayerForCurrentViewport();


        if (!isDesktop()) {

            widget.classList.remove(
                "music-player-floating-minimized",
                "dragging"
            );

            displayMode =
                "expanded";

            updateBubbleState();

            return;
        }


        restorePosition();


        const savedMode =
            localStorage.getItem(
                STORAGE.displayMode
            );


        if (
            savedMode === "minimized"
        ) {

            displayMode =
                "minimized";

            widget.classList.add(
                "music-player-floating-minimized"
            );

        } else {

            displayMode =
                "expanded";

            widget.classList.remove(
                "music-player-floating-minimized"
            );
        }


        updateBubbleState();
    }


    /* =========================================================
       DRAGGING
       ========================================================= */

    function beginDrag(event) {

        if (!isDesktop()) {
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

        const isBubble =
            target.closest(
                ".music-player-bubble"
            );


        /*
         * Controls themselves should not drag.
         */

        if (
            !isBubble &&
            (
                target.closest("button") ||
                target.closest("input") ||
                target.closest("a") ||
                target.closest("select") ||
                target.closest("textarea")
            )
        ) {
            return;
        }


        dragging =
            true;

        dragMoved =
            false;

        dragPointerId =
            event.pointerId;


        const rect =
            widget.getBoundingClientRect();


        dragStartX =
            event.clientX;

        dragStartY =
            event.clientY;

        dragStartLeft =
            rect.left;

        dragStartTop =
            rect.top;


        widget.classList.add(
            "dragging"
        );


        document.addEventListener(
            "pointermove",
            handleDrag,
            true
        );

        document.addEventListener(
            "pointerup",
            endDrag,
            true
        );

        document.addEventListener(
            "pointercancel",
            endDrag,
            true
        );


        event.preventDefault();
    }


    function handleDrag(event) {

        if (
            !dragging ||
            event.pointerId !==
            dragPointerId
        ) {
            return;
        }


        const dx =
            event.clientX -
            dragStartX;

        const dy =
            event.clientY -
            dragStartY;


        if (
            Math.abs(dx) > 3 ||
            Math.abs(dy) > 3
        ) {

            dragMoved =
                true;
        }


        let left =
            dragStartLeft +
            dx;

        let top =
            dragStartTop +
            dy;


        const position =
            clampPosition(
                left,
                top
            );


        widget.style.left =
            position.left +
            "px";

        widget.style.top =
            position.top +
            "px";

        widget.style.right =
            "auto";
    }


    function endDrag(event) {

        if (!dragging) {
            return;
        }


        if (
            event.pointerId !==
            undefined &&
            dragPointerId !==
            null &&
            event.pointerId !==
            dragPointerId
        ) {
            return;
        }


        dragging =
            false;

        dragPointerId =
            null;


        widget.classList.remove(
            "dragging"
        );


        document.removeEventListener(
            "pointermove",
            handleDrag,
            true
        );

        document.removeEventListener(
            "pointerup",
            endDrag,
            true
        );

        document.removeEventListener(
            "pointercancel",
            endDrag,
            true
        );


        savePosition();
        savePlayerState();
    }


    /* =========================================================
       EVENTS
       ========================================================= */

    function bindPlayerEvents() {

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

                savePlayerState();
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
            cyclePlayMode
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
                        (
                            audio.currentTime /
                            audio.duration
                        ) * 100;
                }

                savePlayerState();
            }
        );


        audio.addEventListener(
            "play",
            function () {

                setPlayingUI(
                    true
                );

                updateBrowserTitle();

                savePlayerState();
            }
        );


        audio.addEventListener(
            "pause",
            function () {

                setPlayingUI(
                    false
                );

                savePlayerState();
            }
        );


        audio.addEventListener(
            "volumechange",
            function () {

                volumeBar.value =
                    audio.volume;

                updateMuteButton();

                savePlayerState();
            }
        );


        audio.addEventListener(
            "ended",
            function () {

                if (
                    playMode === 0
                ) {

                    currentTrack =
                        (
                            currentTrack + 1
                        ) %
                        tracks.length;


                } else if (
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
                }

                loadTrack(
                    currentTrack
                );

                playAudio();
            }
        );
    }


    /* =========================================================
       INITIALIZATION
       ========================================================= */

    function init() {

        const widget = document.createElement("div");
        widget.id = "parijat-floating-player";

        document.body.appendChild(widget);

        if (
            !widget ||
            !player
        ) {
            return;
        }


        audio =
            document.getElementById(
                "audio"
            );

        playBtn =
            document.getElementById(
                "playBtn"
            );

        nextBtn =
            document.getElementById(
                "nextBtn"
            );

        prevBtn =
            document.getElementById(
                "prevBtn"
            );

        seekbar =
            document.getElementById(
                "seekbar"
            );

        trackTitle =
            document.getElementById(
                "trackTitle"
            );

        trackArtist =
            document.getElementById(
                "trackArtist"
            );

        volumeBar =
            document.getElementById(
                "volumeBar"
            );

        muteBtn =
            document.getElementById(
                "muteBtn"
            );

        modeBtn =
            document.getElementById(
                "modeBtn"
            );


        if (
            !audio ||
            !playBtn ||
            !nextBtn ||
            !prevBtn ||
            !seekbar ||
            !trackTitle ||
            !trackArtist ||
            !volumeBar ||
            !muteBtn ||
            !modeBtn
        ) {
            console.error(
                "[Cyber Player] Required elements are missing."
            );

            return;
        }


        setupFloatingElements();

        bindPlayerEvents();

        widget.addEventListener(
            "pointerdown",
            beginDrag,
            false
        );

        movePlayerForCurrentViewport();

        syncDesktopMode();

        window.addEventListener(
            "resize",
            syncDesktopMode
        );

        window.addEventListener(
            "beforeunload",
            function () {
                savePlayerState();
                savePosition();
            }
        );

        loadPlaylist();

        window.setInterval(
            savePlayerState,
            1000
        );
    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init,
            { once: true }
        );

    } else {

        init();
    }

})();