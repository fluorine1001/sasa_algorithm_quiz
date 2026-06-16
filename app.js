// 전역 변수
let allProblems = [];

// DOM 요소
const sectionFilter = document.getElementById('sectionFilter');
const difficultyFilter = document.getElementById('difficultyFilter');
const drawBtn = document.getElementById('drawBtn');
const resultContainer = document.getElementById('resultContainer');
const messageArea = document.getElementById('messageArea');

// 1. 데이터 불러오기
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

// 2. 무작위 섞기 (Fisher-Yates 알고리즘)
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// 3. 문제 추출 로직 (평균 난이도 근사치 탐색)
function drawProblems() {
    const selectedSection = sectionFilter.value;
    const targetAvg = difficultyFilter.value;

    // 1단계: 분반 기준으로만 1차 필터링
    const filteredBySection = allProblems.filter(problem => {
        return selectedSection === 'all' || 
               problem.section === Number(selectedSection) || 
               problem.section === 0;
    });

    // 방어 로직: 해당 분반 문제가 6개 미만이면 즉시 종료
    if (filteredBySection.length < 6) {
        resultContainer.innerHTML = '';
        messageArea.textContent = `조건에 맞는 문제가 부족합니다. (현재 ${filteredBySection.length}개 / 최소 6개 필요)`;
        return;
    }

    let bestSet = [];
    
    if (targetAvg === 'all') {
        // 완전 랜덤인 경우 그냥 섞어서 6개 추출
        bestSet = shuffleArray(filteredBySection).slice(0, 6);
    } else {
        // 목표 평균 난이도에 맞추기 위한 반복 탐색
        const targetNumber = Number(targetAvg);
        let closestDifference = Infinity;
        const MAX_ATTEMPTS = 100; // 최대 100번 탐색

        for (let i = 0; i < MAX_ATTEMPTS; i++) {
            const candidateSet = shuffleArray(filteredBySection).slice(0, 6);
            
            // 뽑힌 6개의 평균 난이도 계산
            const currentSum = candidateSet.reduce((sum, p) => sum + p.difficulty, 0);
            const currentAvg = currentSum / 6;
            
            // 목표 평균과의 차이 계산 (절댓값)
            const diff = Math.abs(currentAvg - targetNumber);

            // 기존에 찾은 것보다 차이가 작으면 최적의 조합(bestSet) 교체
            if (diff < closestDifference) {
                closestDifference = diff;
                bestSet = candidateSet;
            }

            // 오차가 0.1 이하라면 완벽한 조합에 가까우므로 즉시 탐색 종료 (성능 최적화)
            if (diff <= 0.1) break;
        }
    }

    // 결과 렌더링
    renderProblems(bestSet);
    
    // 최종 뽑힌 문제들의 실제 평균 계산하여 메시지 출력
    const finalSum = bestSet.reduce((sum, p) => sum + p.difficulty, 0);
    const finalAvg = (finalSum / 6).toFixed(2);

    if (targetAvg === 'all') {
        messageArea.textContent = `6개의 문제가 무작위로 추출되었습니다. (세트 실제 평균: ${finalAvg})`;
    } else {
        messageArea.textContent = `목표 평균(${targetAvg})에 맞춰 최적의 문제들이 추출되었습니다. (세트 실제 평균: ${finalAvg})`;
    }
}

// 4. 화면 출력 함수
function renderProblems(problems) {
    const diffText = { 1: '하', 2: '중', 3: '상' };
    resultContainer.innerHTML = ''; // 기존 화면 초기화

    problems.forEach((problem, index) => {
        const sectionText = problem.section === 0 ? '공통' : `${problem.section}분반`;
        
        // 카드 요소 생성
        const card = document.createElement('a');
        card.href = problem.url;
        card.target = "_blank"; // 새 탭에서 열기
        card.className = "block bg-white border border-gray-200 rounded-lg p-5 shadow hover:shadow-lg hover:border-blue-400 transition duration-200 cursor-pointer";
        
        // 카드 내부 HTML
        card.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <span class="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded">${sectionText}</span>
                <span class="text-sm font-medium text-gray-500">난이도: ${problem.difficulty} (${diffText[problem.difficulty]})</span>
            </div>
            <h3 class="text-lg font-bold text-gray-800 mb-2">${index + 1}. ${problem.title}</h3>
            <p class="text-blue-500 text-sm font-medium mt-4 group-hover:underline flex items-center">
                문제 풀러 가기 
                <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
            </p>
        `;
        
        resultContainer.appendChild(card);
    });
}

// 이벤트 리스너 연결
drawBtn.addEventListener('click', drawProblems);

// 앱 초기화 (최초 데이터 불러오기)
fetchProblems();
