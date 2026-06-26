const fileInput = document.querySelector("#memberFile");
const teamSizeInput = document.querySelector("#teamSize");
const makeBtn = document.querySelector("#makeBtn");
const shuffleBtn = document.querySelector("#shuffleBtn");
const copyImageBtn = document.querySelector("#copyImageBtn");
const summary = document.querySelector("#summary");
const hint = document.querySelector("#hint");
const captureArea = document.querySelector("#captureArea");
const teamBoard = document.querySelector("#teamBoard");

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
    showToast("구성원 txt 파일을 먼저 선택해줘");
    return;
  }

  if (!teamSize) return;

  try {
    const text = await file.text();
    members = parseMembers(text);

    if (members.length === 0) {
      showToast("파일에 구성원 이름이 없어");
      return;
    }

    // 팀 만들기 버튼은 입력한 teamSize 기준으로 새 판 생성
    teams = makeRandomTeams(members, teamSize);
    render();
  } catch (error) {
    console.error(error);
    showToast("파일을 읽는 중 문제가 생겼어");
  }
}

function handleShuffleAgain() {
  if (teams.length === 0) {
    showToast("먼저 txt 파일로 팀을 만들어줘");
    return;
  }

  // 현재 사용자가 드래그로 조정한 팀별 인원 수 저장
  // 예: 3,3,2 -> [3, 3, 2]
  // 예: 4,4 -> [4, 4]
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
    showToast("팀당 인원은 1 이상의 정수로 입력해줘");
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

// 또 섞기 때 사용하는 함수
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

function render() {
  const teamSize = getTeamSize() ?? 1;
  const total = teams.flat().length;

  summary.textContent = `${total}명`;
  hint.textContent =
    "이름을 드래그해서 다른 팀으로 옮기거나 인원수를 바꿀 수 있어요.";

  if (teams.length === 0) {
    captureArea.hidden = true;
    return;
  }

  captureArea.hidden = false;
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
            <h3>${escapeHtml(title)}</h3>
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

  // 빈 줄은 제거한다.
  teams = teams.filter((team) => team.length > 0);
}

async function handleCopyImage() {
  if (teams.length === 0) {
    showToast("복사할 팀 결과가 없어");
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

    showToast("팀 결과 이미지를 클립보드에 복사했어");
  } catch (error) {
    console.error(error);

    // 일부 브라우저/환경에서는 이미지 클립보드 복사가 막힐 수 있어서 다운로드로 대체
    const canvas = drawTeamsToCanvas(teams);
    const dataUrl = canvas.toDataURL("image/png");

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "team-result.png";
    link.click();

    showToast("클립보드 복사가 막혀서 PNG로 다운로드했어");
  }
}

function drawTeamsToCanvas(teamData) {
  const scale = 2;
  const padding = 36;
  const rowGap = 22;
  const cardGap = 10;
  const cardHeight = 42;
  const rowHeaderHeight = 32;
  const rowPadding = 18;
  const maxWidth = 1100;

  const ctxForMeasure = document.createElement("canvas").getContext("2d");
  ctxForMeasure.font = "bold 16px system-ui";

  const rows = teamData.map((team, index) => {
    const isLeftover =
      index === teamData.length - 1 &&
      team.length < Number(teamSizeInput.value);
    const title = `${index + 1}팀`;

    const cards = team.map((name) => {
      const width = Math.ceil(ctxForMeasure.measureText(name).width) + 32;
      return {
        name,
        width: Math.max(width, 72),
      };
    });

    let lineWidth = 0;
    let lines = 1;

    cards.forEach((card) => {
      if (
        lineWidth + card.width + cardGap >
        maxWidth - padding * 2 - rowPadding * 2
      ) {
        lines++;
        lineWidth = 0;
      }

      lineWidth += card.width + cardGap;
    });

    const height =
      rowPadding * 2 +
      rowHeaderHeight +
      lines * cardHeight +
      (lines - 1) * cardGap;

    return {
      title,
      cards,
      height,
    };
  });

  const width = maxWidth;
  const height =
    padding * 2 +
    52 +
    rows.reduce((sum, row) => sum + row.height, 0) +
    rowGap * Math.max(0, rows.length - 1);

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#111827";
  ctx.font = "bold 26px system-ui";
  ctx.fillText("랜덤 팀 배정 결과", padding, padding + 26);

  ctx.fillStyle = "#6b7280";
  ctx.font = "14px system-ui";
  ctx.fillText(
    `총 ${teamData.flat().length}명 · ${teamData.length}개의 팀`,
    padding,
    padding + 50
  );

  let y = padding + 78;

  rows.forEach((row) => {
    roundRect(
      ctx,
      padding,
      y,
      width - padding * 2,
      row.height,
      18,
      "#f8fafc",
      "#e5e7eb"
    );

    ctx.fillStyle = "#111827";
    ctx.font = "bold 17px system-ui";
    ctx.fillText(row.title, padding + rowPadding, y + rowPadding + 18);

    ctx.fillStyle = "#4b5563";
    ctx.font = "bold 13px system-ui";
    ctx.fillText(
      `${row.cards.length}명`,
      width - padding - rowPadding - 40,
      y + rowPadding + 18
    );

    let x = padding + rowPadding;
    let cardY = y + rowPadding + rowHeaderHeight;

    row.cards.forEach((card) => {
      if (x + card.width > width - padding - rowPadding) {
        x = padding + rowPadding;
        cardY += cardHeight + cardGap;
      }

      roundRect(
        ctx,
        x,
        cardY,
        card.width,
        cardHeight,
        999,
        "#ffffff",
        "#d1d5db"
      );

      ctx.fillStyle = "#111827";
      ctx.font = "bold 15px system-ui";
      ctx.fillText(card.name, x + 16, cardY + 27);

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