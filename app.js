// =====================================================================
// ★ 사용자 설정 영역
// =====================================================================

// 1. 난이도별 계산 점수 (가중치 폭을 넓혀 섞일 확률을 자연스럽게 만듦)
const DIFFICULTY_WEIGHTS = {
    1: 10,  // 하
    2: 25,  // 중
    3: 50   // 상
};

// 2. low, mid, high 각각의 목표 평균 점수 설정
const TARGET_AVERAGES = {
    'low':  19,  // 하 위주지만 중/상이 섞임 (예: 하4, 중1, 상1 평균 = 19.1)
    'mid':  28,  // 고르게 섞이거나 중 위주 (예: 하2, 중2, 상2 평균 = 28.3)
    'high': 38   // 상 위주지만 하/중이 섞임 (예: 하1, 중1, 상4 평균 = 39.1)
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

// 중복 없는 제작자로만 문제 후보 세트를 구성하는 함수
function getUniqueCreatorCandidate(problems, targetCount) {
    const groups = {};
    problems.forEach(p => {
        if (!groups[p.name]) groups[p.name] = [];
        groups[p.name].push(p);
    });
    
    const creators = Object.keys(groups);
    if (creators.length < targetCount) return null;
    
    const selectedCreators = shuffleArray(creators).slice(0, targetCount);
    
    const candidateSet = selectedCreators.map(creator => {
        const creatorProblems = groups[creator];
        const randomIndex = Math.floor(Math.random() * creatorProblems.length);
        return creatorProblems[randomIndex];
    });
    
    return candidateSet;
}

// 문제 추출 로직
function drawProblems() {
    const selectedSection = sectionFilter.value;
    const targetLevel = difficultyFilter.value;
    const targetCount = parseInt(countFilter.value, 10) || 6;

    // 1차 필터링 (분반)
    const filteredBySection = allProblems.filter(problem => {
        return selectedSection === 'all' || 
               problem.section === Number(selectedSection) || 
               problem.section === 0;
    });

    // 중복 없는 제작자 검사 (방어 로직)
    const uniqueCreatorsCount = new Set(filteredBySection.map(p => p.name)).size;
    if (uniqueCreatorsCount < targetCount) {
        resultContainer.innerHTML = '';
        messageArea.textContent = `조건에 맞는 문제의 총 제작자 수(${uniqueCreatorsCount}명)가 목표 문제 셋 크기(${targetCount}개)보다 적어 중복 없는 세트를 만들 수 없습니다.`;
        return;
    }

    let bestSet = [];
    
    if (targetLevel === 'all') {
        bestSet = getUniqueCreatorCandidate(filteredBySection, targetCount);
    } else {
        const targetAvg = TARGET_AVERAGES[targetLevel];
        let closestDifference = Infinity;
        const MAX_ATTEMPTS = 300; 

        for (let i = 0; i < MAX_ATTEMPTS; i++) {
            const candidateSet = getUniqueCreatorCandidate(filteredBySection, targetCount);
            if (!candidateSet) break;
            
            const currentSum = candidateSet.reduce((sum, p) => sum + DIFFICULTY_WEIGHTS[p.difficulty], 0);
            const currentAvg = currentSum / targetCount;
            
            const diff = Math.abs(currentAvg - targetAvg);

            if (diff < closestDifference) {
                closestDifference = diff;
                bestSet = candidateSet;
            }

            if (diff <= 0.05) break; 
        }
    }

    // 최종 순서 무작위 섞기
    const finalShuffledSet = shuffleArray(bestSet);

    // 결과 렌더링
    renderProblems(finalShuffledSet);
    
    // [수정] 안내 메시지 간소화
    if (targetLevel === 'all') {
        messageArea.textContent = `${targetCount}개의 문제가 랜덤 추출되었습니다.`;
    } else {
        messageArea.textContent = `${targetCount}개의 문제가 생성되었습니다.`;
    }
}

// 화면 출력 함수
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
