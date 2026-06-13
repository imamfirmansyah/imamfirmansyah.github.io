// ==========================================
// 1. DEKLARASI ELEMEN DOM GLOBAL
// ==========================================
// (Tetap biarkan di paling atas agar bisa diakses semua fungsi)
const GITHUB_REPO_URL = "https://github.com/imamfirmansyah/imamfirmansyah.github.io";
let containsInput, positionInputs, helperBtn, helperCard, helperInputs;
let toggleKeyboardBtn, keyboardCard, keyboardButtons, wordGridResultEl, emptyStateEl, resultCountEl;
let internalDatabase = [];
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

  loadInternalDatabase();
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

// MODIFIKASI ADAPTIF: Memisahkan pembacaan data antara Kamus Lokal & Datamuse API
async function fetchWordleWords(pattern, isContainsMode) {
  try {
    resultCountEl.textContent = "Mencari...";
    let finalWords = [];

    // ==========================================
    // LALUAN 1: AMBIL DATA DARI SUMBER UTAMA (Lokal / API)
    // ==========================================
    if (isContainsMode) {
      const response = await fetch("./wordle-words.json");
      if (!response.ok) throw new Error("Gagal memuat file wordle-words.json");

      const localData = await response.json();
      finalWords = localData
        .map((word) => word.toUpperCase())
        .filter((word) => word.length === 5 && /^[A-Z]+$/.test(word));
    } else {
      const baseUrl = "https://api.datamuse.com/words";
      const params = new URLSearchParams({ sp: pattern, max: "1000" });
      const response = await fetch(`${baseUrl}?${params.toString()}`);
      if (!response.ok) throw new Error(`API merespon dengan status: ${response.status}`);

      const apiData = await response.json();
      if (!Array.isArray(apiData)) throw new Error("Format data API bukan Array.");

      let filteredApi = apiData.filter((item) => item.word.length === 5 && /^[a-zA-Z]+$/.test(item.word));
      filteredApi.sort((a, b) => b.score - a.score);
      finalWords = filteredApi.map((item) => item.word.toUpperCase());
    }

    // ==========================================
    // LALUAN 2: BERSIHKAN & SATUKAN DENGAN DATABASE BACKUP INTERNAL
    // ==========================================
    // Gabungkan database utama dengan database internal kustom (Mencegah duplikasi dengan Set)
    let allPossibleWords = [];
    if (internalDatabase && internalDatabase.length > 0) {
      // Satukan kedua array tanpa peduli kata tersebut ada di wordle-words atau tidak
      const mergedSet = new Set([...internalDatabase, ...finalWords]);
      allPossibleWords = Array.from(mergedSet);
    } else {
      allPossibleWords = [...finalWords];
    }

    // ==========================================
    // LALUAN 3: PENYARINGAN AKHIR KATA YANG VALID (APLIKASIKAN RULES)
    // ==========================================
    let filteredResults = [];

    if (isContainsMode) {
      // Jika mode contains, semua kata (termasuk backup kustom) disaring berdasarkan kandungan huruf
      const requiredLetters = containsInput.value.toUpperCase().split("");
      filteredResults = allPossibleWords.filter((word) => requiredLetters.every((letter) => word.includes(letter)));
    } else {
      // Jika mode posisi, semua kata (termasuk backup kustom) disaring berdasarkan kotak posisi c1-c5
      filteredResults = allPossibleWords.filter((word) => {
        for (let i = 0; i < 5; i++) {
          if (pattern[i] !== "?" && word[i] !== pattern[i].toUpperCase()) {
            return false;
          }
        }
        return true;
      });
    }

    // ==========================================
    // LALUAN 4: PRIORITAS UTAMA (VIP SORTING)
    // ==========================================
    // Mengurutkan hasil akhir agar kata dari database.json SELALU nangkring di paling atas
    filteredResults.sort((a, b) => {
      const aInInternal = internalDatabase.includes(a);
      const bInInternal = internalDatabase.includes(b);

      if (aInInternal && !bInInternal) return -1; // Kata internal naik ke atas
      if (!aInInternal && bInInternal) return 1; // Kata internal naik ke atas

      // Jika sesama kata internal atau sesama kata umum, urutkan berdasarkan abjad A-Z
      return a.localeCompare(b);
    });

    // Kirim hasil akhir super lengkap ke UI
    renderNewWords(filteredResults);
  } catch (error) {
    console.error("Gagal mengambil atau memproses data kata:", error);
    resultCountEl.textContent = "Error";
    wordGridResultEl.innerHTML = `<div class="error-state" style="color: #ef4444; padding: 20px; text-align: center;">Gagal memuat kata.</div>`;
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

  if (helperInputs) {
    helperInputs.forEach((input) => {
      if (input) input.value = "";
    });
  }

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

      // 1. Periksa apakah kata sudah terdaftar di database internal JSON hasil tabungan
      if (internalDatabase && internalDatabase.includes(word)) {
        span.style.backgroundColor = "#bbf7d0"; // Visual warna hijau soft
        span.title = "Sudah ada di database internal";
      } else {
        span.title = "Klik untuk simpan ke database GitHub";

        // 2. Pasang event klik untuk memicu otomatisasi GitHub Issue
        span.addEventListener("click", () => {
          const confirmSave = confirm(`Apakah Anda ingin menyimpan kata "${word}" ke database GitHub?`);
          if (confirmSave) {
            const issueTitle = encodeURIComponent(`ADD_WORD:${word}`);
            const issueBody = encodeURIComponent(`Menambahkan kata baru dari aplikasi Wordle Solver.`);
            const githubIssueUrl = `${GITHUB_REPO_URL}/issues/new?title=${issueTitle}&body=${issueBody}`;

            window.open(githubIssueUrl, "_blank");
          }
        });
      }

      wordGridResultEl.appendChild(span);
    });
  }
}

function applyHelperHighlight() {
  const wordPills = document.querySelectorAll(".word-grid-result .word-pill");
  const helperRules = helperInputs.map((input) => (input && input.value ? input.value.toUpperCase() : null));
  const hasActiveRule = helperRules.some((rule) => rule !== null);

  wordPills.forEach((pill) => {
    if (!hasActiveRule) {
      pill.classList.remove("highlight-helper");
      return;
    }

    const wordText = pill.textContent.toUpperCase();
    let isMatch = true;

    for (let i = 0; i < 5; i++) {
      const requiredLetter = helperRules[i];
      if (requiredLetter && wordText[i] !== requiredLetter) {
        isMatch = false;
        break;
      }
    }

    if (isMatch) {
      pill.classList.add("highlight-helper");
    } else {
      pill.classList.remove("highlight-helper");
    }
  });
}

// ==========================================
// 6. MANAGEMENT REPOSITORI REPO KATA (database.json)
// ==========================================
async function loadInternalDatabase() {
  try {
    const response = await fetch("./database.json");
    if (response.ok) {
      internalDatabase = await response.json();
      console.log("Database internal berhasil dimuat:", internalDatabase);
    }
  } catch (error) {
    console.error("Gagal memuat database internal:", error);
  }
}
