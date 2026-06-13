async function solveWordle() {
  const results = document.getElementById("results");

  results.innerHTML = "Mencari...";

  try {
    /*
     * INPUT CONTAINS
     */
    const containsInput = document
      .querySelector('[name="the-letters"]')
      .value.toLowerCase()
      .replace(/[^a-z]/g, "");

    const containsLetters = [...new Set(containsInput.split(""))];

    /*
     * INPUT POSISI
     */
    const positions = [
      document.getElementById("c1").value,
      document.getElementById("c2").value,
      document.getElementById("c3").value,
      document.getElementById("c4").value,
      document.getElementById("c5").value,
    ].map((v) => v.trim().toLowerCase());

    /*
     * Minimal satu input
     */
    const hasContains = containsLetters.length > 0;
    const hasPosition = positions.some(Boolean);

    if (!hasContains && !hasPosition) {
      results.innerHTML = '<span class="error-msg">Masukkan minimal satu huruf.</span>';
      return;
    }

    /*
     * Build Datamuse Pattern
     *
     * kosong = ?
     * isi = huruf
     *
     * contoh:
     * ['', 'a', '', '', 'd']
     *
     * => ?a??d
     */
    const pattern = positions.map((letter) => letter || "?").join("");

    /*
     * Datamuse API
     */
    const response = await fetch(`https://api.datamuse.com/words?sp=${pattern}&max=1000`);

    const data = await response.json();

    /*
     * Filter:
     * - hanya 5 huruf
     * - harus contain semua huruf yang diinput
     */
    const matches = data
      .map((item) => item.word.toLowerCase())
      .filter((word) => word.length === 5)
      .filter((word) => containsLetters.every((letter) => word.includes(letter)));

    /*
     * Unique + Sort
     */
    const uniqueMatches = [...new Set(matches)].sort();

    /*
     * Render
     */
    if (uniqueMatches.length === 0) {
      results.innerHTML = '<span class="error-msg">Tidak ada kata yang cocok.</span>';
      return;
    }

    results.innerHTML = `
            <div class="info-msg">
                Ditemukan ${uniqueMatches.length} kata
            </div>
            <ul class="result-list">
                ${uniqueMatches.map((word) => `<li>${word.toUpperCase()}</li>`).join("")}
            </ul>
        `;
  } catch (error) {
    console.error(error);

    results.innerHTML = '<span class="error-msg">Gagal mengambil data dari Datamuse.</span>';
  }
}
