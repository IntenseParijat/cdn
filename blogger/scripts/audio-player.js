/* About Parijat / Cyber Player - external controller */
(function () {
  "use strict";

  const DESKTOP_BREAKPOINT = 1620;
  const PLAYLIST_URL =
    "https://cdn.jsdelivr.net/gh/IntenseParijat/cdn@main/blogger/scripts/playlist.json";

  const STORAGE = {
    track: "cyberPlayerTrack",
    time: "cyberPlayerTime",
    volume: "cyberPlayerVolume",
    playing: "cyberPlayerPlaying",
    mode: "cyberPlayerMode",
    displayMode: "cyberPlayerDisplayMode",
    left: "floatingMusicPlayerLeft",
    top: "floatingMusicPlayerTop"
  };

  let tracks = [];
  let currentTrack = 0;
  let playMode = 0;

  let audio, playBtn, nextBtn, prevBtn, seekbar, trackTitle;
  let trackArtist, volumeBar, muteBtn, modeBtn, player, widget;
  let bubble, minimizeBtn;

  let displayMode = "expanded";
  let originalDocumentTitle = document.title;

  let dragging = false;
  let dragMoved = false;
  let dragPointerId = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartLeft = 0;
  let dragStartTop = 0;

  const isDesktop = () =>
    window.innerWidth >= DESKTOP_BREAKPOINT;

  function num(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function updateBrowserTitle() {
    const name = trackTitle?.textContent?.trim();

    if (
      !name ||
      name === "LOADING..." ||
      name === "UNKNOWN TRACK"
    ) {
      document.title = originalDocumentTitle;
      return;
    }

    document.title =
      name.toUpperCase() + " • About Parijat";
  }

  function loadTrack(index) {
    if (!tracks.length) return;

    currentTrack = Math.max(
      0,
      Math.min(index, tracks.length - 1)
    );

    const track = tracks[currentTrack];

    audio.src = track.src;
    trackTitle.textContent = track.title;
    trackArtist.textContent = track.artist;

    updateBrowserTitle();
    savePlayerState();
  }

  async function loadPlaylist() {
    try {
      const response = await fetch(
        PLAYLIST_URL,
        { cache: "no-cache" }
      );

      if (!response.ok) {
        throw new Error(
          "Playlist request failed: " +
          response.status
        );
      }

      const playlist = await response.json();

      if (!Array.isArray(playlist)) {
        throw new Error(
          "Playlist JSON is not an array"
        );
      }

      tracks = playlist
        .map(track => ({
          title: String(
            track?.title || "UNTITLED"
          ),
          artist: String(
            track?.artist || ""
          ),
          src: String(
            track?.src || ""
          )
        }))
        .filter(track => track.src);

      if (!tracks.length) {
        trackTitle.textContent =
          "PLAYLIST EMPTY";
        return;
      }

      currentTrack = Math.min(
        num(
          localStorage.getItem(
            STORAGE.track
          ),
          0
        ),
        tracks.length - 1
      );

      loadTrack(currentTrack);
      await restoreAudioState();

    } catch (error) {
      console.error(
        "[Cyber Player]",
        error
      );

      trackTitle.textContent =
        "FAILED TO LOAD PLAYLIST";

      document.title =
        originalDocumentTitle;
    }
  }

  function setPlayingUI(playing) {
    playBtn.innerHTML = playing
      ? `
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="white"
        >
          <path d="M6 5h4v14H6zm8 0h4v14h-4z"/>
        </svg>
      `
      : `
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="white"
        >
          <path d="M8 5v14l11-7z"/>
        </svg>
      `;

    player.classList.toggle(
      "playing",
      playing
    );

    widget.classList.toggle(
      "music-player-playing",
      playing
    );

    updateBubbleState();
  }

  async function playAudio() {
    try {
      await audio.play();

      setPlayingUI(true);
      savePlayerState();

    } catch (error) {
      console.warn(
        "[Cyber Player] Playback was blocked:",
        error
      );

      setPlayingUI(false);
    }
  }

  function pauseAudio() {
    audio.pause();
    setPlayingUI(false);
    savePlayerState();
  }

  function nextTrack() {
    if (!tracks.length) return;

    if (
      playMode === 1 &&
      tracks.length > 1
    ) {
      let next = currentTrack;

      while (
        next === currentTrack
      ) {
        next =
          Math.floor(
            Math.random() *
            tracks.length
          );
      }

      currentTrack = next;

    } else {
      currentTrack =
        (currentTrack + 1) %
        tracks.length;
    }

    loadTrack(currentTrack);
    playAudio();
  }

  function previousTrack() {
    if (!tracks.length) return;

    currentTrack =
      currentTrack <= 0
        ? tracks.length - 1
        : currentTrack - 1;

    loadTrack(currentTrack);
    playAudio();
  }

  function updateMuteButton() {
    muteBtn.innerHTML =
      audio.volume === 0
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
    if (audio.volume > 0) {
      audio.dataset.previousVolume =
        String(audio.volume);

      audio.volume = 0;
      volumeBar.value = 0;

    } else {
      audio.volume =
        num(
          audio.dataset.previousVolume,
          1
        ) || 1;

      volumeBar.value =
        audio.volume;
    }

    updateMuteButton();
    savePlayerState();
  }

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

  function savePlayerState() {
    try {
      localStorage.setItem(
        STORAGE.track,
        String(currentTrack)
      );

      localStorage.setItem(
        STORAGE.time,
        String(audio?.currentTime || 0)
      );

      localStorage.setItem(
        STORAGE.volume,
        String(audio?.volume ?? 1)
      );

      localStorage.setItem(
        STORAGE.playing,
        String(
          audio
            ? !audio.paused
            : false
        )
      );

      localStorage.setItem(
        STORAGE.mode,
        String(playMode)
      );

      localStorage.setItem(
        STORAGE.displayMode,
        displayMode
      );

    } catch (_) {}
  }

  function savePosition() {
    if (!widget || !isDesktop()) {
      return;
    }

    const left =
      parseInt(
        widget.style.left,
        10
      );

    const top =
      parseInt(
        widget.style.top,
        10
      );

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

  function restoreTime(savedTime) {
    if (
      Number.isFinite(audio.duration) &&
      audio.duration > 0
    ) {
      audio.currentTime =
        Math.min(
          savedTime,
          Math.max(
            0,
            audio.duration - 0.25
          )
        );
    }
  }

  async function restoreAudioState() {
    playMode = Math.max(
      0,
      Math.min(
        2,
        num(
          localStorage.getItem(
            STORAGE.mode
          ),
          0
        )
      )
    );

    const volume =
      Math.max(
        0,
        Math.min(
          1,
          num(
            localStorage.getItem(
              STORAGE.volume
            ),
            1
          )
        )
      );

    const time =
      Math.max(
        0,
        num(
          localStorage.getItem(
            STORAGE.time
          ),
          0
        )
      );

    const shouldResume =
      localStorage.getItem(
        STORAGE.playing
      ) === "true";

    audio.volume = volume;
    volumeBar.value = volume;

    if (audio.readyState >= 1) {
      restoreTime(time);
    } else {
      audio.addEventListener(
        "loadedmetadata",
        () => restoreTime(time),
        { once: true }
      );
    }

    updateMuteButton();
    updateModeButton();

    if (shouldResume) {
      await playAudio();
    } else {
      setPlayingUI(false);
    }
  }

  function injectStyles() {
    if (
      document.getElementById(
        "cyber-player-floating-styles"
      )
    ) {
      return;
    }

    const style =
      document.createElement("style");

    style.id =
      "cyber-player-floating-styles";

    style.textContent = `
      @media screen and (min-width: 1620px) {

        body.item-view #HTML1 {
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

        body.item-view #HTML1.dragging {
          cursor: grabbing !important;
        }

        body.item-view #HTML1 .widget-content {
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
        }

        body.item-view #HTML1 #player {
          width: 100% !important;
          max-width: none !important;
        }

        body.item-view #HTML1 .floating-minimize-btn {
          position: absolute;
          top: 7px;
          right: 7px;
          z-index: 10003;
          width: 28px;
          height: 28px;
          padding: 0;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 50%;
          background: rgba(20,20,20,.72);
          color: #fff;
          font: 700 18px/26px Arial,sans-serif;
          cursor: pointer !important;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        body.item-view #HTML1 .music-player-bubble {
          display: none;
        }

        body.item-view #HTML1.music-player-floating-minimized {
          width: 58px !important;
          max-width: 58px !important;
          height: 58px !important;
        }

        body.item-view #HTML1.music-player-floating-minimized #player {
          display: none !important;
        }

        body.item-view #HTML1.music-player-floating-minimized .floating-minimize-btn {
          display: none !important;
        }

        body.item-view #HTML1.music-player-floating-minimized .music-player-bubble {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 58px;
          height: 58px;
          margin: 0;
          padding: 0;
          border: 1px solid rgba(255,115,87,.4);
          border-radius: 50%;
          background: linear-gradient(145deg,#1f1f1f,#121212);
          color: #fff;
          font-size: 28px;
          line-height: 1;
          cursor: pointer !important;
          box-sizing: border-box;
          box-shadow:
            0 0 20px rgba(255,115,87,.18),
            inset 0 0 20px rgba(255,255,255,.03);
          touch-action: none;
        }

        /*
         * Loading-style ring.
         * The ring surrounds the bubble and rotates like
         * a loading spinner instead of displaying a symbol.
         */
        body.item-view #HTML1.music-player-floating-minimized
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
            cyberPlayerLoadingSpin
            1s linear infinite;

          pointer-events: none;
        }

        body.item-view #HTML1.music-player-floating-minimized
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
        body.item-view #HTML1 .floating-minimize-btn,
        body.item-view #HTML1 .music-player-bubble {
          display: none !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function setupFloatingElements() {
    injectStyles();

    minimizeBtn =
      document.createElement("button");

    minimizeBtn.type = "button";

    minimizeBtn.className =
      "floating-minimize-btn";

    minimizeBtn.setAttribute(
      "aria-label",
      "Minimize music player"
    );

    minimizeBtn.title = "Minimize";
    minimizeBtn.textContent = "−";

    bubble =
      document.createElement("button");

    bubble.type = "button";

    bubble.className =
      "music-player-bubble";

    bubble.setAttribute(
      "aria-label",
      "Open music player"
    );

    bubble.title =
      "Open music player";

    bubble.textContent = "🎵";

    widget.appendChild(
      minimizeBtn
    );

    widget.appendChild(
      bubble
    );

    minimizeBtn.addEventListener(
      "click",
      event => {
        event.preventDefault();
        event.stopPropagation();

        setDisplayMode(
          "minimized"
        );
      }
    );

    bubble.addEventListener(
      "click",
      event => {

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

  function setDisplayMode(mode) {
    displayMode =
      mode === "minimized"
        ? "minimized"
        : "expanded";

    if (!isDesktop()) {
      displayMode = "expanded";

      widget.classList.remove(
        "music-player-floating-minimized"
      );

      updateBubbleState();

      return;
    }

    widget.classList.toggle(
      "music-player-floating-minimized",
      displayMode === "minimized"
    );

    updateBubbleState();
    savePlayerState();
  }

  function updateBubbleState() {
    if (bubble) {
      bubble.classList.toggle(
        "is-playing",
        !!audio && !audio.paused
      );
    }
  }

  function restorePosition() {
    if (!isDesktop()) return;

    const savedLeft =
      localStorage.getItem(
        STORAGE.left
      );

    const savedTop =
      localStorage.getItem(
        STORAGE.top
      );

    if (
      savedLeft !== null &&
      savedTop !== null
    ) {
      const left =
        Math.min(
          Math.max(
            0,
            num(
              savedLeft,
              0
            )
          ),
          Math.max(
            0,
            window.innerWidth -
              widget.offsetWidth
          )
        );

      const top =
        Math.min(
          Math.max(
            0,
            num(
              savedTop,
              0
            )
          ),
          Math.max(
            0,
            window.innerHeight -
              widget.offsetHeight
          )
        );

      widget.style.left =
        left + "px";

      widget.style.top =
        top + "px";

      widget.style.right =
        "auto";

    } else {
      widget.style.left = "auto";
      widget.style.top = "85px";
      widget.style.right = "32px";
    }
  }

  function syncDesktopMode() {
    if (!isDesktop()) {
      widget.classList.remove(
        "music-player-floating-minimized",
        "dragging"
      );

      widget.style.position = "";
      widget.style.left = "";
      widget.style.top = "";
      widget.style.right = "";
      widget.style.width = "";
      widget.style.maxWidth = "";
      widget.style.margin = "";
      widget.style.padding = "";

      displayMode = "expanded";

      updateBubbleState();

      return;
    }

    restorePosition();

    displayMode =
      localStorage.getItem(
        STORAGE.displayMode
      ) === "minimized"
        ? "minimized"
        : "expanded";

    widget.classList.toggle(
      "music-player-floating-minimized",
      displayMode === "minimized"
    );

    updateBubbleState();
  }

  function beginDrag(event) {
    if (!isDesktop()) return;

    if (
      event.button !== undefined &&
      event.button !== 0
    ) {
      return;
    }

    const target = event.target;

    const isBubble =
      target.closest(
        ".music-player-bubble"
      );

    /*
     * Full player controls remain clickable.
     * The minimized bubble is draggable too.
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

    dragging = true;
    dragMoved = false;
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
      dragMoved = true;
    }

    let left =
      dragStartLeft + dx;

    let top =
      dragStartTop + dy;

    left = Math.max(
      0,
      Math.min(
        left,
        window.innerWidth -
          widget.offsetWidth
      )
    );

    top = Math.max(
      0,
      Math.min(
        top,
        window.innerHeight -
          widget.offsetHeight
      )
    );

    widget.style.left =
      left + "px";

    widget.style.top =
      top + "px";

    widget.style.right =
      "auto";
  }

  function endDrag(event) {
    if (!dragging) return;

    if (
      event.pointerId !== undefined &&
      dragPointerId !== null &&
      event.pointerId !==
        dragPointerId
    ) {
      return;
    }

    dragging = false;
    dragPointerId = null;

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
  }

  function bindPlayerEvents() {

    playBtn.addEventListener(
      "click",
      () => {
        if (audio.paused) {
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
      () => {
        if (
          Number.isFinite(
            audio.duration
          )
        ) {
          audio.currentTime =
            (Number(
              seekbar.value
            ) / 100) *
            audio.duration;
        }

        savePlayerState();
      }
    );

    volumeBar.addEventListener(
      "input",
      () => {
        audio.volume =
          Number(
            volumeBar.value
          );

        updateMuteButton();
        savePlayerState();
      }
    );

    muteBtn.addEventListener(
      "click",
      toggleMute
    );

    modeBtn.addEventListener(
      "click",
      () => {
        playMode =
          (playMode + 1) % 3;

        updateModeButton();
        savePlayerState();
      }
    );

    audio.addEventListener(
      "timeupdate",
      () => {
        if (
          Number.isFinite(
            audio.duration
          ) &&
          audio.duration > 0
        ) {
          seekbar.value =
            (audio.currentTime /
              audio.duration) *
            100;
        }

        savePlayerState();
      }
    );

    audio.addEventListener(
      "play",
      () => {
        setPlayingUI(true);
        updateBrowserTitle();
        savePlayerState();
      }
    );

    audio.addEventListener(
      "pause",
      () => {
        setPlayingUI(false);
        savePlayerState();
      }
    );

    audio.addEventListener(
      "volumechange",
      () => {
        volumeBar.value =
          audio.volume;

        updateMuteButton();
        savePlayerState();
      }
    );

    audio.addEventListener(
      "ended",
      () => {

        if (playMode === 0) {
          currentTrack =
            (currentTrack + 1) %
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

        /*
         * Repeat mode (2) keeps
         * the current track.
         */

        loadTrack(
          currentTrack
        );

        playAudio();
      }
    );
  }

  function init() {
    widget =
      document.getElementById(
        "HTML1"
      );

    player =
      document.getElementById(
        "player"
      );

    if (!widget || !player) {
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
      return;
    }

    setupFloatingElements();
    bindPlayerEvents();

    widget.addEventListener(
      "pointerdown",
      beginDrag,
      false
    );

    window.addEventListener(
      "resize",
      syncDesktopMode
    );

    window.addEventListener(
      "beforeunload",
      () => {
        savePlayerState();
        savePosition();
      }
    );

    syncDesktopMode();
    updateModeButton();
    updateMuteButton();
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