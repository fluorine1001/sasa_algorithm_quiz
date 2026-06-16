// =====================================================================
// ★ 사용자 설정 영역
// =====================================================================

// 1. 난이도별 계산 점수
const DIFFICULTY_WEIGHTS = {
    1: 1,  // 하
    2: 3,  // 중
    3: 6   // 상
};

// 2. low, mid, high 각각의 목표 평균 점수 설정
const TARGET_AVERAGES = {
    'low':  1.5,  
    'mid':  3.0,  
    'high': 5.0   
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

// [신규 함수] 중복 없는 제작자로만 문제 후보 세트를 구성하는 함수
function getUniqueCreatorCandidate(problems, targetCount) {
    // 1. 제작자별로 문제 그룹화
    const groups = {};
    problems.forEach(p => {
        if (!groups[p.name]) groups[p.name] = [];
        groups[p.name].push(p);
    });
    
    const creators = Object.keys(groups);
    
    // 방어 로직: 유니크한 제작자 수가 요구한 문제 개수보다 적으면 후보 생성 불가
    if (creators.length < targetCount) return null;
    
    // 2. 제작자 목록을 섞은 후 필요한 만큼(targetCount) 추출
    const selectedCreators = shuffleArray(creators).slice(0, targetCount);
    
    // 3. 선별된 각 제작자의 문제 목록 중 무작위로 1개씩만 선택
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
        // 중복 없는 제작자 조합으로 완전 랜덤 추출
        bestSet = getUniqueCreatorCandidate(filteredBySection, targetCount);
    } else {
        const targetAvg = TARGET_AVERAGES[targetLevel];
        let closestDifference = Infinity;
        const MAX_ATTEMPTS = 300; 

        for (let i = 0; i < MAX_ATTEMPTS; i++) {
            // 중복 없는 제작자 조합 1세트 생성
            const candidateSet = getUniqueCreatorCandidate(filteredBySection, targetCount);
            if (!candidateSet) break;
            
            // 가중치(1, 3, 6)를 적용하여 평균 계산
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

    // 화면 출력 전 최종 순서 무작위 섞기 (제작자 순서도 랜덤화)
    const finalShuffledSet = shuffleArray(bestSet);

    // 결과 렌더링
    renderProblems(finalShuffledSet);
    
    // 안내 메시지용 계산
    const finalSum = finalShuffledSet.reduce((sum, p) => sum + DIFFICULTY_WEIGHTS[p.difficulty], 0);
    const finalAvg = (finalSum / targetCount).toFixed(2);
    
    const finalCounts = { 1: 0, 2: 0, 3: 0 };
    finalShuffledSet.forEach(p => finalCounts[p.difficulty]++);

    if (targetLevel === 'all') {
        messageArea.textContent = `제작자 중복 없이 ${targetCount}개의 문제가 랜덤 추출되었습니다. (가중 평균: ${finalAvg} / 하:${finalCounts[1]} 중:${finalCounts[2]} 상:${finalCounts[3]})`;
    } else {
        const levelLabelMap = { 'low': '하', 'mid': '중', 'high': '상' };
        messageArea.textContent = `[${levelLabelMap[targetLevel]}] 난이도 가중 평균에 맞춰 제작자 중복 없는 ${targetCount}문제가 생성되었습니다. (세트 가중 평균: ${finalAvg} / 하:${finalCounts[1]} 중:${finalCounts[2]} 상:${finalCounts[3]})`;
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
