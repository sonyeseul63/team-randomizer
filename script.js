const fileInput = document.querySelector("#memberFile");
const fileUploadWrapper = fileInput.closest(".file-upload-wrapper");
const fileUploadText = document.querySelector("#fileUploadText");
const memberText = document.querySelector("#memberText");

document.querySelectorAll("#inputModeControl .input-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll("#inputModeControl .input-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    document.querySelector("#tabFile").hidden = tab.dataset.tab !== "file";
    document.querySelector("#tabText").hidden = tab.dataset.tab !== "text";
  });
});
const teamSizeInput = document.querySelector("#teamSize");
const makeBtn = document.querySelector("#makeBtn");
const shuffleBtn = document.querySelector("#shuffleBtn");
const copyImageBtn = document.querySelector("#copyImageBtn");
const summary = document.querySelector("#summary");
const hint = document.querySelector("#hint");
const teamBoard = document.querySelector("#teamBoard");

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) {
    fileUploadText.textContent = file.name;
    fileUploadWrapper.classList.add("has-file");
  } else {
    fileUploadText.textContent = "클릭해서 .txt 파일 선택";
    fileUploadWrapper.classList.remove("has-file");
  }
});

let teams = [];
let draggedInfo = null;

makeBtn.addEventListener("click", handleMakeTeams);
shuffleBtn.addEventListener("click", handleShuffleAgain);
copyImageBtn.addEventListener("click", handleCopyImage);

async function handleMakeTeams() {
  const file = fileInput.files[0];
  const teamSize = getTeamSize();

  const isFileTab = document.querySelector("#inputModeControl .input-tab.active").dataset.tab === "file";
  const teamMode = document.querySelector("#teamMode").value;

  if (isFileTab && !file) {
    showToast("구성원 txt 파일을 먼저 선택해주세요");
    return;
  }

  if (!teamSize) return;

  try {
    const text = isFileTab ? await file.text() : memberText.value;
    const members = parseMembers(text);

    if (members.length === 0) {
      showToast("파일에 구성원 이름이 없어요");
      return;
    }

    teams = teamMode === "numTeams"
      ? makeRandomTeamsByNumTeams(members, teamSize)
      : makeRandomTeams(members, teamSize);
    render();
  } catch (error) {
    console.error(error);
    showToast("파일을 읽는 중 문제가 생겼어요");
  }
}

function handleShuffleAgain() {
  if (teams.length === 0) {
    showToast("먼저 txt 파일로 팀을 만들어 주세요");
    return;
  }

  const currentLayout = teams.map((team) => team.length);
  const currentMembers = teams.flat();
  teams = makeRandomTeamsByLayout(currentMembers, currentLayout);

  render();
}

function getTeamSize() {
  const teamSize = Number(teamSizeInput.value);

  if (!Number.isInteger(teamSize) || teamSize < 1) {
    showToast("팀당 인원은 1 이상의 정수로 입력해주세요");
    return null;
  }

  return teamSize;
}

function parseMembers(text) {
  return text
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

function makeRandomTeamsByNumTeams(memberList, numTeams) {
  const shuffled = shuffle([...memberList]);
  const result = Array.from({ length: numTeams }, () => []);
  shuffled.forEach((member, i) => result[i % numTeams].push(member));
  return result;
}

function makeRandomTeams(memberList, teamSize) {
  const shuffled = shuffle([...memberList]);
  const result = [];

  for (let i = 0; i < shuffled.length; i += teamSize) {
    result.push(shuffled.slice(i, i + teamSize));
  }

  return result;
}

function makeRandomTeamsByLayout(memberList, layout) {
  const shuffled = shuffle([...memberList]);
  const result = [];

  let startIndex = 0;

  for (const size of layout) {
    const team = shuffled.slice(startIndex, startIndex + size);
    result.push(team);
    startIndex += size;
  }

  return result;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));

    [array[i], array[randomIndex]] = [array[randomIndex], array[i]];
  }

  return array;
}

function render() {
  const teamSize = getTeamSize() ?? 1;
  const total = teams.flat().length;

  summary.textContent = `총 ${total}명 · ${teams.length}팀`;
  hint.innerHTML = "이름을 드래그해서 팀을 조정하거나, 인원수를 바꿀 수 있어요.<br>바뀐 인원수로 다시 섞어보세요.";
  teamBoard.innerHTML = teams
    .map((team, teamIndex) => {
      const isLeftover =
        teamIndex === teams.length - 1 && team.length < teamSize;
      const title = `${teamIndex + 1}팀`;

      return `
        <section
          class="team-row ${isLeftover ? "leftover" : ""}"
          data-team-index="${teamIndex}"
        >
          <div class="team-header">
            <div class="team-label">
              <span class="team-num">${teamIndex + 1}</span>
            <h3>${escapeHtml(title)}</h3>
            </div>
            <span>${team.length}명</span>
          </div>

          <div class="member-list">
            ${team
              .map(
                (member, memberIndex) => `
                  <div
                    class="member-card"
                    draggable="true"
                    data-team-index="${teamIndex}"
                    data-member-index="${memberIndex}"
                  >
                    ${escapeHtml(member)}
                  </div>
                `
              )
              .join("")}
          </div>
        </section>
      `;
    })
    .join("");

  attachDragEvents();
}

function attachDragEvents() {
  const cards = document.querySelectorAll(".member-card");
  const rows = document.querySelectorAll(".team-row");

  cards.forEach((card) => {
    card.addEventListener("dragstart", () => {
      draggedInfo = {
        fromTeamIndex: Number(card.dataset.teamIndex),
        fromMemberIndex: Number(card.dataset.memberIndex),
      };

      card.classList.add("dragging");
    });

    card.addEventListener("dragend", () => {
      draggedInfo = null;
      card.classList.remove("dragging");

      document
        .querySelectorAll(".team-row")
        .forEach((row) => row.classList.remove("drag-over"));
    });
  });

  rows.forEach((row) => {
    row.addEventListener("dragover", (event) => {
      event.preventDefault();
      row.classList.add("drag-over");
    });

    row.addEventListener("dragleave", () => {
      row.classList.remove("drag-over");
    });

    row.addEventListener("drop", (event) => {
      event.preventDefault();
      row.classList.remove("drag-over");

      if (!draggedInfo) return;

      const toTeamIndex = Number(row.dataset.teamIndex);

      moveMember(
        draggedInfo.fromTeamIndex,
        draggedInfo.fromMemberIndex,
        toTeamIndex
      );

      render();
    });
  });
}

function moveMember(fromTeamIndex, fromMemberIndex, toTeamIndex) {
  if (fromTeamIndex === toTeamIndex) return;

  const fromTeam = teams[fromTeamIndex];

  if (!fromTeam) return;

  const [member] = fromTeam.splice(fromMemberIndex, 1);

  if (!member) return;

  teams[toTeamIndex].push(member);
  teams = teams.filter((team) => team.length > 0);
}

async function handleCopyImage() {
  if (teams.length === 0) {
    showToast("저장할 팀 결과가 없어요");
    return;
  }

  try {
    const canvas = await html2canvas(document.querySelector("#captureArea"), {
      scale: 2,
      backgroundColor: "#FFFFFF",
      ignoreElements: (el) => el.id === "hint" || el.id === "resultBtns",
    });

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    showToast("이미지를 클립보드에 복사했어요");
  } catch (error) {
    console.error(error);

    try {
      const canvas = await html2canvas(document.querySelector("#captureArea"), {
        scale: 2,
        backgroundColor: "#FFFFFF",
        ignoreElements: (el) => el.id === "hint" || el.id === "resultBtns",
      });
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = "team-result.png";
      link.click();
      showToast("클립보드 복사가 막혀서 PNG로 저장했어요");
    } catch {
      showToast("이미지 생성 중 문제가 생겼어요");
    }
  }
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  const prevToast = document.querySelector(".toast");

  if (prevToast) {
    prevToast.remove();
  }

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2200);
}