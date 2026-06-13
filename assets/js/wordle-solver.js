// ==========================================
// 1. DEKLARASI ELEMEN DOM GLOBAL
// ==========================================
// (Tetap biarkan di paling atas agar bisa diakses semua fungsi)
let containsInput, positionInputs, helperBtn, helperCard, helperInputs;
let toggleKeyboardBtn, keyboardCard, keyboardButtons, wordGridResultEl, emptyStateEl, resultCountEl;

let blockedLetters = [];

// ==========================================
// GERBANG UTAMA: JALANKAN SAAT HTML SELESAI DIMUAT
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  // Inisialisasi elemen DOM setelah halaman siap
  containsInput = document.getElementById("containsLetters");
  positionInputs = [
    document.getElementById("c1"),
    document.getElementById("c2"),
    document.getElementById("c3"),
    document.getElementById("c4"),
    document.getElementById("c5"),
  ];
  helperBtn = document.querySelector(".btn-helper");
  helperCard = document.querySelector(".helper-card");
  helperInputs = [
    document.getElementById("helper-c1"),
    document.getElementById("helper-c2"),
    document.getElementById("helper-c3"),
    document.getElementById("helper-c4"),
    document.getElementById("helper-c5"),
  ];
  toggleKeyboardBtn = document.querySelector(".btn-secondary");
  keyboardCard = document.querySelector(".keyboard-card");
  keyboardButtons = document.querySelectorAll(".keyboard-row button");
  wordGridResultEl = document.querySelector(".word-grid-result");
  emptyStateEl = document.querySelector(".empty-state");
  resultCountEl = document.querySelector(".result-count");

  // ----------------------------------------
  // ISI MODUL 1: NAVIGASI GRID UTOMATIS (c1 - c5)
  // ----------------------------------------
  positionInputs.forEach((input, index) => {
    if (!input) return; // Proteksi jika elemen tidak ditemukan
    input.addEventListener("input", (e) => {
      e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
      if (e.target.value && index < positionInputs.length - 1) {
        positionInputs[index + 1].focus();
      }
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !e.target.value && index > 0) {
        positionInputs[index - 1].focus();
      }
    });
  });

  // ----------------------------------------
  // ISI MODUL 2: TOGGLE KEYBOARD & HELPER CARD
  // ----------------------------------------
  if (toggleKeyboardBtn) {
    toggleKeyboardBtn.addEventListener("click", () => {
      if (keyboardCard.style.display === "none" || keyboardCard.style.display === "") {
        keyboardCard.style.display = "block";
        toggleKeyboardBtn.classList.add("active");
      } else {
        keyboardCard.style.display = "none";
        toggleKeyboardBtn.classList.remove("active");
      }
    });
  }

  if (helperBtn) {
    helperBtn.addEventListener("click", () => {
      if (helperCard.style.display === "none" || helperCard.style.display === "") {
        helperCard.style.display = "block";
        helperBtn.classList.add("active");
      } else {
        helperCard.style.display = "none";
        helperBtn.classList.remove("active");
      }
    });
  }

  // ----------------------------------------
  // ISI MODUL 3: KEYBOARD CLICK EVENT
  // ----------------------------------------
  keyboardButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const letter = button.textContent.trim().toUpperCase();
      toggleLetterBlock(letter, button);
    });
  });

  // ----------------------------------------
  // ISI MODUL 4: TOMBOL SEARCH API EVENT
  // ----------------------------------------
  document.querySelectorAll(".btn-search").forEach((button) => {
    button.addEventListener("click", async (e) => {
      const currentForm = e.target.closest(".solver-form");
      const isContainsMode = currentForm.querySelector("#containsLetters") !== null;
      let pattern = "";

      if (isContainsMode) {
        const letters = containsInput.value.trim().toLowerCase();
        if (!letters) return alert("Masukkan huruf terlebih dahulu!");
        pattern = "?????";
      } else {
        let hasValue = false;
        pattern = positionInputs
          .map((input) => {
            if (input && input.value) {
              hasValue = true;
              return input.value.toLowerCase();
            }
            return "?";
          })
          .join("");

        if (!hasValue) return alert("Isi minimal salah satu kotak posisi!");
      }
      await fetchWordleWords(pattern, isContainsMode);
    });
  });

  // ----------------------------------------
  // ISI MODUL 5: LIVE HELPER HIGHLIGHTER (h1 - h5)
  // ----------------------------------------
  helperInputs.forEach((input, index) => {
    if (!input) {
      console.error(`Elemen helper-c${index + 1} tidak ditemukan di HTML!`);
      return; // Mencegah error baris 224 jika HTML h1-h5 belum ter-render
    }
    input.addEventListener("input", (e) => {
      e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");

      console.log(`Helper-c${index + 1} mendeteksi input huruf:`, e.target.value); // <--- DEBUG 1

      if (e.target.value && index < helperInputs.length - 1) {
        helperInputs[index + 1].focus();
      }
      applyHelperHighlight();
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !e.target.value && index > 0) {
        helperInputs[index - 1].focus();
      }
      setTimeout(applyHelperHighlight, 0);
    });
  });
});

// ==========================================
// KEYDOWN GLOBAL (DI LUAR DOMContentLoaded JUGA AMAN)
// ==========================================
document.addEventListener("keydown", (e) => {
  const letter = e.key.toUpperCase();
  const isUserTypingInInput = document.activeElement.tagName === "INPUT";

  if (/^[A-Z]$/.test(letter) && !isUserTypingInInput) {
    const targetButton = Array.from(keyboardButtons).find((btn) => btn.textContent.trim().toUpperCase() === letter);
    if (targetButton) {
      toggleLetterBlock(letter, targetButton);
    }
  }
});

// ==========================================
// FUNCTIONS UTILITY (TETAP DI LUAR LUAR GERBANG AMAN)
// ==========================================
function toggleLetterBlock(letter, buttonElement) {
  if (blockedLetters.includes(letter)) {
    blockedLetters = blockedLetters.filter((l) => l !== letter);
    buttonElement.classList.remove("eliminated");
    buttonElement.style.backgroundColor = "";
    buttonElement.style.color = "";
  } else {
    blockedLetters.push(letter);
    buttonElement.classList.add("eliminated");
    buttonElement.style.backgroundColor = "#ef4444";
    buttonElement.style.color = "#fff";
  }
  updateWordVisibility();
}

function updateWordVisibility() {
  const wordPills = document.querySelectorAll(".word-grid-result .word-pill");
  let visibleCount = 0;

  wordPills.forEach((pill) => {
    const wordText = pill.textContent.toUpperCase();
    const shouldHide = blockedLetters.some((letter) => wordText.includes(letter));

    if (shouldHide) {
      pill.style.display = "none";
    } else {
      pill.style.display = "";
      visibleCount++;
    }
  });

  resultCountEl.textContent = `${visibleCount} kata`;

  if (visibleCount === 0 && wordPills.length > 0) {
    emptyStateEl.style.display = "flex";
  } else if (visibleCount > 0) {
    emptyStateEl.style.display = "none";
  }
}

async function fetchWordleWords(pattern, isContainsMode) {
  try {
    resultCountEl.textContent = "Mencari...";

    // PERBAIKAN MUTLAK: Menyusun URL menggunakan URLSearchParams agar tanda '?' dan '&' digabung otomatis dengan benar oleh browser
    const baseUrl = "https://api.datamuse.com/words";
    const params = new URLSearchParams({
      sp: pattern, // Memasukkan pola seperti '???a?' atau '?????'
      max: "1000", // Membatasi maksimal 1000 kata
    });

    const apiUrl = `${baseUrl}?${params.toString()}`;
    console.log("Menembak API ke alamat:", apiUrl); // Untuk mempermudah Anda melakukan tracking lewat console log

    const response = await fetch(apiUrl);

    // Proteksi tambahan: Jika server mengembalikan status selain 200 (OK), hentikan proses agar tidak crash
    if (!response.ok) {
      throw new Error(`Server API Datamuse merespon dengan status: ${response.status}`);
    }

    const data = await response.json();

    // Pastikan data yang didapat benar-benar berbentuk Array sebelum di-manipulasi
    if (!Array.isArray(data)) {
      throw new Error("Format data yang diterima dari API bukan berbentuk Array.");
    }

    // Daripada hanya mengambil string teks di awal, kita simpan objek utuhnya dulu
    let finalData = data.filter((item) => item.word.length === 5 && /^[a-zA-Z]+$/.test(item.word));

    if (isContainsMode) {
      const requiredLetters = containsInput.value.toLowerCase().split("");
      finalData = finalData.filter((item) =>
        requiredLetters.every((letter) => item.word.toLowerCase().includes(letter)),
      );
    }

    // URUTKAN BERDASARKAN SKOR POPULARITAS TERTINGGI (Desending)
    finalData.sort((a, b) => b.score - a.score);

    // Baru konversi ke Array String Kapital untuk dilempar ke renderNewWords
    let finalWords = finalData.map((item) => item.word.toUpperCase());

    renderNewWords(finalWords);
  } catch (error) {
    console.error("Gagal mengambil data dari Datamuse:", error);
    resultCountEl.textContent = "Error";

    // Tampilkan pesan error ramah di dalam grid hasil jika API bermasalah
    wordGridResultEl.innerHTML = `<div class="error-state" style="color: #ef4444; padding: 20px; text-align: center;">Gagal memuat kata. Pastikan format input benar atau coba lagi nanti.</div>`;
  }
}

function renderNewWords(words) {
  wordGridResultEl.innerHTML = "";
  blockedLetters = [];
  keyboardButtons.forEach((btn) => {
    btn.style.backgroundColor = "";
    btn.style.color = "";
    btn.classList.remove("eliminated");
  });

  helperInputs.forEach((input) => {
    if (input) input.value = "";
  });

  if (words.length === 0) {
    emptyStateEl.style.display = "flex";
    resultCountEl.textContent = "0 kata";
  } else {
    emptyStateEl.style.display = "none";
    resultCountEl.textContent = `${words.length} kata`;

    words.forEach((word) => {
      const span = document.createElement("span");
      span.className = "word-pill";
      span.textContent = word;
      wordGridResultEl.appendChild(span);
    });
  }
}

function applyHelperHighlight() {
  const wordPills = document.querySelectorAll(".word-grid-result .word-pill");

  // Ambil nilai terbaru langsung dari elemen yang sudah terhubung dengan ID helper-c1 s/nd helper-c5
  const helperRules = helperInputs.map((input) => (input && input.value ? input.value.toUpperCase() : null));
  const hasActiveRule = helperRules.some((rule) => rule !== null);

  wordPills.forEach((pill) => {
    // Jika semua kotak helper kosong, bersihkan semua border kuning
    if (!hasActiveRule) {
      pill.classList.remove("highlight-helper");
      return;
    }

    const wordText = pill.textContent.toUpperCase();
    let isMatch = true;

    // Periksa kecocokan posisi huruf (0-4)
    for (let i = 0; i < 5; i++) {
      const requiredLetter = helperRules[i];
      // Jika helper diisi dan huruf di posisi tersebut berbeda, nyatakan tidak cocok
      if (requiredLetter && wordText[i] !== requiredLetter) {
        isMatch = false;
        break;
      }
    }

    // Pasang atau lepas class border kuning
    if (isMatch) {
      pill.classList.add("highlight-helper");
    } else {
      pill.classList.remove("highlight-helper");
    }
  });
}
