const fileInput = document.querySelector("#memberFile");
const fileUploadWrapper = fileInput.closest(".file-upload-wrapper");
const fileUploadText = document.querySelector("#fileUploadText");
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

let members = [];
let teams = [];
let draggedInfo = null;

makeBtn.addEventListener("click", handleMakeTeams);
shuffleBtn.addEventListener("click", handleShuffleAgain);
copyImageBtn.addEventListener("click", handleCopyImage);

async function handleMakeTeams() {
  const file = fileInput.files[0];
  const teamSize = getTeamSize();

  if (!file) {
    showToast("구성원 txt 파일을 먼저 선택해주세요");
    return;
  }

  if (!teamSize) return;

  try {
    const text = await file.text();
    members = parseMembers(text);

    if (members.length === 0) {
      showToast("파일에 구성원 이름이 없어요");
      return;
    }

    // 팀 만들기 버튼은 입력한 teamSize 기준으로 새 판 생성
    teams = makeRandomTeams(members, teamSize);
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

  // 현재 사용자가 드래그로 조정한 팀별 인원 수 저장
  const currentLayout = teams.map((team) => team.length);

  // 현재 화면에 있는 모든 이름을 다시 모음
  const currentMembers = teams.flat();

  // 현재 팀별 인원 수는 유지하고, 이름만 다시 랜덤 배치
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

// 처음 팀 만들 때 사용하는 함수
// 입력한 teamSize 기준으로 3명씩, 4명씩 이런 식으로 자름
function makeRandomTeams(memberList, teamSize) {
  const shuffled = shuffle([...memberList]);
  const result = [];

  for (let i = 0; i < shuffled.length; i += teamSize) {
    result.push(shuffled.slice(i, i + teamSize));
  }

  return result;
}

// 섞기에 사용하는 함수
// 현재 팀별 인원 수 layout을 유지한 채 이름만 다시 섞음
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

// Fisher-Yates shuffle
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));

    [array[i], array[randomIndex]] = [array[randomIndex], array[i]];
  }

  return array;
}

// 팀 생성후 화면 렌더링
function render() {
  const teamSize = getTeamSize() ?? 1;
  const total = teams.flat().length;

  summary.textContent = `총 ${total}명 · ${teams.length}팀`;
  hint.innerHTML = "이름을 드래그해 팀을 조정하거나, 인원수를 바꿀 수 있어요.<br>바뀐 인원 수에서 다시 섞어보세요.";
  resultBtns.hidden = false;
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

// 드래그
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

// 멤버 저장
function moveMember(fromTeamIndex, fromMemberIndex, toTeamIndex) {
  if (fromTeamIndex === toTeamIndex) return;

  const fromTeam = teams[fromTeamIndex];

  if (!fromTeam) return;

  const [member] = fromTeam.splice(fromMemberIndex, 1);

  if (!member) return;

  teams[toTeamIndex].push(member);

  // 빈 줄은 제거
  teams = teams.filter((team) => team.length > 0);
}

async function handleCopyImage() {
  if (teams.length === 0) {
    showToast("복사할 팀 결과가 없어요");
    return;
  }

  try {
    const canvas = drawTeamsToCanvas(teams);
    const blob = await canvasToBlob(canvas);

    await navigator.clipboard.write([
      new ClipboardItem({
        "image/png": blob,
      }),
    ]);

    showToast("팀 결과 이미지를 클립보드에 복사했어요");
  } catch (error) {
    console.error(error);

    // 일부 브라우저/환경에서는 이미지 클립보드 복사가 막힐 수 있어서 다운로드로 대체
    const canvas = drawTeamsToCanvas(teams);
    const dataUrl = canvas.toDataURL("image/png");

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "team-result.png";
    link.click();

    showToast("클립보드 복사가 막혀서 PNG로 다운로드했어요");
  }
}

// 결과 이미지 생성
function drawTeamsToCanvas(teamData) {
  const scale = 2;
  const padding = 36;
  const rowGap = 14;
  const cardGap = 8;
  const cardHeight = 36;
  const cardPadH = 14;
  const rowHeaderHeight = 36;
  const rowPadding = 18;
  const badgeSize = 26;
  const maxWidth = 900;
  const font = "'Pretendard', system-ui";

  const ctxM = document.createElement("canvas").getContext("2d");
  ctxM.font = `600 14px ${font}`;

  const rows = teamData.map((team, index) => {
    const title = `${index + 1}팀`;
    const cards = team.map((name) => {
      const w = Math.ceil(ctxM.measureText(name).width) + cardPadH * 2;
      return { name, width: Math.max(w, 56) };
    });

    let lineWidth = 0;
    let lines = 1;
    cards.forEach((card) => {
      if (lineWidth + card.width + cardGap > maxWidth - padding * 2 - rowPadding * 2) {
        lines++;
        lineWidth = 0;
      }
      lineWidth += card.width + cardGap;
    });

    const height = rowPadding * 2 + rowHeaderHeight + lines * cardHeight + (lines - 1) * cardGap;
    return { title, cards, height, index };
  });

  const width = maxWidth;
  const height =
    padding * 2 + 52 +
    rows.reduce((sum, r) => sum + r.height, 0) +
    rowGap * Math.max(0, rows.length - 1);

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);

  // 배경
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);

  // 헤더: "팀 결과"
  ctx.fillStyle = "#1A1A1A";
  ctx.font = `bold 20px ${font}`;
  ctx.fillText("팀 결과", padding, padding + 20);

  // 요약 배지
  const summaryText = `총 ${teamData.flat().length}명 · ${teamData.length}팀`;
  ctx.font = `bold 12px ${font}`;
  const sw = ctx.measureText(summaryText).width + 18;
  roundRect(ctx, padding + 84, padding + 4, sw, 22, 999, "#E6F5FF", null);
  ctx.fillStyle = "#0088D9";
  ctx.fillText(summaryText, padding + 93, padding + 19);

  // 구분선
  ctx.strokeStyle = "#EDEDEA";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, padding + 36);
  ctx.lineTo(width - padding, padding + 36);
  ctx.stroke();

  let y = padding + 52;

  rows.forEach((row) => {
    // 팀 카드
    roundRect(ctx, padding, y, width - padding * 2, row.height, 16, "#FAFAF9", "#EDEDEA");

    // 팀 번호 배지 (파란 둥근 사각형)
    const badgeX = padding + rowPadding;
    const badgeY = y + rowPadding + (rowHeaderHeight - badgeSize) / 2;
    roundRect(ctx, badgeX, badgeY, badgeSize, badgeSize, 8, "#00A1FF", null);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold 12px ${font}`;
    ctx.textAlign = "center";
    ctx.fillText(String(row.index + 1), badgeX + badgeSize / 2, badgeY + badgeSize * 0.68);
    ctx.textAlign = "left";

    // 팀 이름
    ctx.fillStyle = "#1A1A1A";
    ctx.font = `bold 14px ${font}`;
    ctx.fillText(row.title, badgeX + badgeSize + 8, y + rowPadding + rowHeaderHeight * 0.68);

    // 인원수 배지
    const countText = `${row.cards.length}명`;
    ctx.font = `bold 12px ${font}`;
    const cw = ctx.measureText(countText).width + 16;
    const countX = width - padding - rowPadding - cw;
    const countY = y + rowPadding + (rowHeaderHeight - 22) / 2;
    roundRect(ctx, countX, countY, cw, 22, 999, "#F0EFEB", null);
    ctx.fillStyle = "#6B6B6B";
    ctx.fillText(countText, countX + 8, countY + 15);

    // 멤버 칩
    let x = padding + rowPadding;
    let cardY = y + rowPadding + rowHeaderHeight;

    row.cards.forEach((card) => {
      if (x + card.width > width - padding - rowPadding) {
        x = padding + rowPadding;
        cardY += cardHeight + cardGap;
      }
      roundRect(ctx, x, cardY, card.width, cardHeight, 999, "#FFFFFF", "#DEDED9");
      ctx.fillStyle = "#1A1A1A";
      ctx.font = `600 14px ${font}`;
      ctx.fillText(card.name, x + cardPadH, cardY + cardHeight * 0.65);
      x += card.width + cardGap;
    });

    y += row.height + rowGap;
  });

  return canvas;
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("canvas blob 생성 실패"));
      }
    }, "image/png");
  });
}

function roundRect(ctx, x, y, width, height, radius, fillStyle, strokeStyle) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();

  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 1;
    ctx.stroke();
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