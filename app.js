// =====================================================================
// ★ 시스템 핵심 설정 영역 (확률형 멀티 시나리오)
// =====================================================================

// 각 모드별 난이도 구성 시나리오
const LEVEL_SCENARIOS = {
    'low': [
        { weight: 55, ratio: { 1: 70, 2: 30, 3: 0 } },   // 하 중심 (55% 확률)
        { weight: 45, ratio: { 1: 50, 2: 35, 3: 15 } }   // 상/중이 적극적으로 섞임 (45% 확률)
    ],
    'mid': [
        { weight: 50, ratio: { 1: 25, 2: 55, 3: 20 } },   // 하가 살짝 더 많은 중간 (50% 확률)
        { weight: 50, ratio: { 1: 20, 2: 55, 3: 25 } }   // 상이 살짝 더 많은 중간 (50% 확률)
    ],
    'high': [
        { weight: 30, ratio: { 1: 0, 2: 30, 3: 70 } },   // [조정] 순수 매운맛 - 상/중 위주 (30%로 축소)
        { weight: 50, ratio: { 1: 15, 2: 35, 3: 50 } },  // [신규] 하가 확실히 끼어드는 매운맛 (50% 확률)
        { weight: 20, ratio: { 1: 20, 2: 20, 3: 60 } }   // [신규] 상의 비중이 매우 높지만 하도 함께 등장 (20% 확률)
    ]
};

// =====================================================================

// 전역 변수
let allProblems = [];

// DOM 요소
const sectionFilter = document.getElementById('sectionFilter');
const difficultyFilter = document.getElementById('difficultyFilter');
const countFilter = document.getElementById('countFilter');
const drawBtn = document.getElementById('drawBtn');
const resultContainer = document.getElementById('resultContainer');
const messageArea = document.getElementById('messageArea');

// 데이터 불러오기
async function fetchProblems() {
    try {
        const response = await fetch('problems.json');
        if (!response.ok) throw new Error('네트워크 응답 에러');
        allProblems = await response.json();
    } catch (error) {
        messageArea.textContent = '문제 데이터를 불러오는 데 실패했습니다.';
        console.error('Fetch error:', error);
    }
}

// 무작위 섞기
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// 제작자 중복 없는 후보 세트 생성
function getUniqueCreatorCandidate(problems, targetCount) {
    const groups = {};
    problems.forEach(p => {
        if (!groups[p.name]) groups[p.name] = [];
        groups[p.name].push(p);
    });
    
    const creators = Object.keys(groups);
    if (creators.length < targetCount) return null;
    
    const selectedCreators = shuffleArray(creators).slice(0, targetCount);
    
    return selectedCreators.map(creator => {
        const creatorProblems = groups[creator];
        return creatorProblems[Math.floor(Math.random() * creatorProblems.length)];
    });
}

// 무작위 시나리오 선택 함수
function getRandomScenario(level) {
    const scenarios = LEVEL_SCENARIOS[level];
    const totalWeight = scenarios.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const scenario of scenarios) {
        random -= scenario.weight;
        if (random <= 0) return scenario.ratio;
    }
    return scenarios[0].ratio;
}

// 문제 셋 생성 로직
function drawProblems() {
    const selectedSection = sectionFilter.value;
    const targetLevel = difficultyFilter.value; 
    const targetCount = parseInt(countFilter.value, 10) || 6;

    // 1차 분반 필터링
    const filteredBySection = allProblems.filter(problem => {
        return selectedSection === 'all' || 
               problem.section === Number(selectedSection) || 
               problem.section === 0;
    });

    // 방어 로직
    const uniqueCreatorsCount = new Set(filteredBySection.map(p => p.name)).size;
    if (uniqueCreatorsCount < targetCount) {
        resultContainer.innerHTML = '';
        messageArea.textContent = `조건에 맞는 문제의 총 제작자 수(${uniqueCreatorsCount}명)가 목표 문제 셋 크기(${targetCount}개)보다 적어 중복 없는 세트를 만들 수 없습니다.`;
        return;
    }

    // '전체' 선택 시 내부 선택 확률 조절 (high의 비중 낮춤)
    let activeLevel = targetLevel;
    if (activeLevel === 'all') {
        const rand = Math.random() * 100;
        if (rand < 40) {
            activeLevel = 'low';   
        } else if (rand < 85) {
            activeLevel = 'mid';   
        } else {
            activeLevel = 'high';  
        }
    }

    // 적용할 난이도 비율 시나리오 확정
    const targetRatio = getRandomScenario(activeLevel);

    let bestSet = [];
    let lowestPenalty = Infinity;
    const MAX_ATTEMPTS = 500; 

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const candidateSet = getUniqueCreatorCandidate(filteredBySection, targetCount);
        if (!candidateSet) break;
        
        const actualCounts = { 1: 0, 2: 0, 3: 0 };
        candidateSet.forEach(p => actualCounts[p.difficulty]++);
        
        // 정밀 정량 패널티 계산
        let currentPenalty = 0;
        [1, 2, 3].forEach(d => {
            const idealCount = targetCount * (targetRatio[d] / 100);
            currentPenalty += Math.abs(actualCounts[d] - idealCount);
        });

        if (currentPenalty < lowestPenalty) {
            lowestPenalty = currentPenalty;
            bestSet = candidateSet;
        }
    }

    // 최종 출력 순서 무작위 정렬
    const finalShuffledSet = shuffleArray(bestSet);
    renderProblems(finalShuffledSet);
    
    // 워딩 수정 반영 ('전체')
    if (targetLevel === 'all') {
        messageArea.textContent = `${targetCount}개의 문제가 랜덤 추출되었습니다.`;
    } else {
        messageArea.textContent = `${targetCount}개의 문제가 생성되었습니다.`;
    }
}

// 컴팩트 화면 출력 함수
function renderProblems(problems) {
    const diffText = { 1: '하', 2: '중', 3: '상' };
    const diffColor = {
        1: 'bg-green-100 text-green-800', 
        2: 'bg-yellow-100 text-yellow-800',
        3: 'bg-red-100 text-red-800'
    };

    resultContainer.innerHTML = ''; 

    problems.forEach((problem, index) => {
        const sectionText = problem.section === 0 ? '공통' : `${problem.section}분반`;
        
        const card = document.createElement('a');
        card.href = problem.url;
        card.target = "_blank";
        card.className = "block bg-white border border-gray-200 rounded p-3 shadow-sm hover:shadow hover:border-blue-400 transition duration-200 cursor-pointer overflow-hidden";
        
        card.innerHTML = `
            <div class="flex items-center gap-2 mb-2">
                <span class="bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded">${sectionText}</span>
                <span class="bg-gray-100 text-gray-600 text-[11px] font-semibold px-2 py-0.5 rounded border border-gray-200">${problem.name}</span>
                <span class="${diffColor[problem.difficulty]} text-[11px] font-bold px-2 py-0.5 rounded">${diffText[problem.difficulty]}</span>
            </div>
            <h3 class="text-base font-bold text-gray-800 mb-1 truncate" title="${problem.title}">
                ${index + 1}. ${problem.title}
            </h3>
            <p class="text-blue-500 text-xs font-medium mt-1 group-hover:underline flex items-center">
                문제 확인하기 
                <svg class="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
            </p>
        `;
        
        resultContainer.appendChild(card);
    });
}

// 이벤트 연결 및 초기화
drawBtn.addEventListener('click', drawProblems);
fetchProblems();
