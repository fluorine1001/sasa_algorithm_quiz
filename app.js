// =====================================================================
// ★ 사용자 설정 영역 (원하는 대로 수치 변경 가능)
// =====================================================================

// 1. 난이도별 계산 점수 (하=1점, 중=3점, 상=6점으로 처리)
const DIFFICULTY_WEIGHTS = {
    1: 1,  // 하
    2: 3,  // 중
    3: 6   // 상
};

// 2. low, mid, high 각각의 목표 평균 점수 설정
// (위의 1, 3, 6점 기준으로 계산되는 세트의 목표 평균값입니다.)
const TARGET_AVERAGES = {
    'low':  1.5,  // '하' 선택 시 목표 평균 (예: 하가 대다수)
    'mid':  3.0,  // '중' 선택 시 목표 평균 (예: 중 중심 또는 하/상 조합)
    'high': 4.5   // '상' 선택 시 목표 평균 (예: 상이 대다수)
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

    if (filteredBySection.length < targetCount) {
        resultContainer.innerHTML = '';
        messageArea.textContent = `조건에 맞는 문제가 부족합니다. (현재 ${filteredBySection.length}개 / 최소 ${targetCount}개 필요)`;
        return;
    }

    let bestSet = [];
    
    if (targetLevel === 'all') {
        // 완전 랜덤 추출
        bestSet = shuffleArray(filteredBySection).slice(0, targetCount);
    } else {
        // 설정된 가중치 기반 목표 평균 가져오기
        const targetAvg = TARGET_AVERAGES[targetLevel];

        let closestDifference = Infinity;
        const MAX_ATTEMPTS = 300; // 정밀한 평균 매칭을 위해 탐색 횟수 상향

        for (let i = 0; i < MAX_ATTEMPTS; i++) {
            const candidateSet = shuffleArray(filteredBySection).slice(0, targetCount);
            
            // [핵심 변경] 하=1, 중=3, 상=6 가중치를 적용하여 합산
            const currentSum = candidateSet.reduce((sum, p) => sum + DIFFICULTY_WEIGHTS[p.difficulty], 0);
            // 가중 평균 계산
            const currentAvg = currentSum / targetCount;
            
            // 설정된 목표 평균과의 오차 계산
            const diff = Math.abs(currentAvg - targetAvg);

            if (diff < closestDifference) {
                closestDifference = diff;
                bestSet = candidateSet;
            }

            if (diff <= 0.05) break; // 오차가 거의 없다면 조기 종료
        }
    }

    // 화면 출력 전 최종 순서 무작위 섞기
    const finalShuffledSet = shuffleArray(bestSet);

    // 결과 렌더링
    renderProblems(finalShuffledSet);
    
    // 안내 메시지용 최종 가중 평균 및 실제 개수 계산
    const finalSum = finalShuffledSet.reduce((sum, p) => sum + DIFFICULTY_WEIGHTS[p.difficulty], 0);
    const finalAvg = (finalSum / targetCount).toFixed(2);
    
    const finalCounts = { 1: 0, 2: 0, 3: 0 };
    finalShuffledSet.forEach(p => finalCounts[p.difficulty]++);

    if (targetLevel === 'all') {
        messageArea.textContent = `${targetCount}개의 문제가 랜덤 추출되었습니다. (가중 평균: ${finalAvg} / 하:${finalCounts[1]} 중:${finalCounts[2]} 상:${finalCounts[3]})`;
    } else {
        const levelLabelMap = { 'low': '하', 'mid': '중', 'high': '상' };
        messageArea.textContent = `[${levelLabelMap[targetLevel]}] 난이도 목표에 맞춰 ${targetCount}문제가 생성되었습니다. (세트 가중 평균: ${finalAvg} / 하:${finalCounts[1]} 중:${finalCounts[2]} 상:${finalCounts[3]})`;
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
                문제 풀러 가기 
                <svg class="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
            </p>
        `;
        
        resultContainer.appendChild(card);
    });
}

// 이벤트 연결 및 초기화
drawBtn.addEventListener('click', drawProblems);
fetchProblems();
