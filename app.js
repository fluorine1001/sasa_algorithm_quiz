// =====================================================================
// ★ 시스템 핵심 설정 영역 (자유롭게 조정 가능)
// =====================================================================

// 1. 난이도별 점수 가중치 (하=10점, 중=25점, 상=50점)
const DIFFICULTY_WEIGHTS = {
    1: 10,  // 하
    2: 25,  // 중
    3: 50   // 상
};

// 2. 모드별 목표 설정 (목표 가중 평균 및 하/중/상 황금 비율 %)
// 비율(ratio)의 총합은 반드시 100이어야 합니다.
const SYSTEM_CONFIGS = {
    'low': {
        targetAvg: 18.0, // 목표 평균 점수
        ratio: { 1: 60, 2: 30, 3: 10 } // 하 60% : 중 30% : 상 10% (상이 낮은 비율로 등장)
    },
    'mid': {
        targetAvg: 27.5, // 목표 평균 점수
        ratio: { 1: 20, 2: 60, 3: 20 } // 하 20% : 중 60% : 상 20% (중 중심, 하/상 고루 분포)
    },
    'high': {
        targetAvg: 39.5, // 목표 평균 점수
        ratio: { 1: 10, 2: 30, 3: 60 } // 하 10% : 중 30% : 상 60% (하가 낮은 비율로 등장)
    }
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

// 무작위 섞기 (Fisher-Yates)
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// 제작자 중복 없는 후보 세트 생성 생성 함수
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

// 문제 셋 생성 로직 (하이브리드 페널티 시스템)
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

    let bestSet = [];
    
    if (targetLevel === 'all') {
        bestSet = getUniqueCreatorCandidate(filteredBySection, targetCount);
    } else {
        const config = SYSTEM_CONFIGS[targetLevel];
        let lowestPenalty = Infinity;
        
        // 정밀한 다중 조건 매칭을 위해 시뮬레이션 횟수를 500회로 상향
        const MAX_ATTEMPTS = 500; 

        for (let i = 0; i < MAX_ATTEMPTS; i++) {
            const candidateSet = getUniqueCreatorCandidate(filteredBySection, targetCount);
            if (!candidateSet) break;
            
            // 1. 실제 개수 및 가중 평균 점수 계산
            const actualCounts = { 1: 0, 2: 0, 3: 0 };
            let totalScore = 0;
            candidateSet.forEach(p => {
                actualCounts[p.difficulty]++;
                totalScore += DIFFICULTY_WEIGHTS[p.difficulty];
            });
            const actualAvg = totalScore / targetCount;
            
            // 2. 가중 평균 점수 오차 (낮을수록 좋음)
            const avgDiff = Math.abs(actualAvg - config.targetAvg);

            // 3. 목표 난이도 분포 오차 계산 (특정 난이도가 실종되는 현상 방지)
            let distributionDiff = 0;
            [1, 2, 3].forEach(d => {
                const idealCount = targetCount * (config.ratio[d] / 100);
                distributionDiff += Math.abs(actualCounts[d] - idealCount);
            });

            // 4. 최종 하이브리드 페널티 점수 합산 
            // 분포도 오차에 가중치(x10)를 부여하여 모든 난이도가 자연스럽게 섞이도록 유도
            const currentPenalty = avgDiff + (distributionDiff * 10);

            if (currentPenalty < lowestPenalty) {
                lowestPenalty = currentPenalty;
                bestSet = candidateSet;
            }
        }
    }

    // 최종 출력 순서 무작위 정렬
    const finalShuffledSet = shuffleArray(bestSet);
    renderProblems(finalShuffledSet);
    
    // 간결한 문구 출력 요구사항 반영
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
