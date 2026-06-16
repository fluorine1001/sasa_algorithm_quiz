// 전역 변수
let allProblems = [];

// DOM 요소
const sectionFilter = document.getElementById('sectionFilter');
const difficultyFilter = document.getElementById('difficultyFilter');
const countFilter = document.getElementById('countFilter');
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

// 3. 문제 추출 로직
function drawProblems() {
    const selectedSection = sectionFilter.value;
    const targetAvg = difficultyFilter.value;
    const targetCount = parseInt(countFilter.value, 10) || 6;

    // 1단계: 분반 기준으로만 1차 필터링
    const filteredBySection = allProblems.filter(problem => {
        return selectedSection === 'all' || 
               problem.section === Number(selectedSection) || 
               problem.section === 0;
    });

    // 방어 로직: 해당 분반 문제가 사용자가 원하는 개수보다 적으면 즉시 종료
    if (filteredBySection.length < targetCount) {
        resultContainer.innerHTML = '';
        messageArea.textContent = `조건에 맞는 문제가 부족합니다. (현재 ${filteredBySection.length}개 / 최소 ${targetCount}개 필요)`;
        return;
    }

    let bestSet = [];
    
    if (targetAvg === 'all') {
        // 완전 랜덤 추출
        bestSet = shuffleArray(filteredBySection).slice(0, targetCount);
    } else {
        // 문제 셋 난이도에 맞추기 위한 반복 탐색
        const targetNumber = Number(targetAvg);
        let closestDifference = Infinity;
        const MAX_ATTEMPTS = 100;

        for (let i = 0; i < MAX_ATTEMPTS; i++) {
            const candidateSet = shuffleArray(filteredBySection).slice(0, targetCount);
            
            const currentSum = candidateSet.reduce((sum, p) => sum + p.difficulty, 0);
            const currentAvg = currentSum / targetCount;
            const diff = Math.abs(currentAvg - targetNumber);

            if (diff < closestDifference) {
                closestDifference = diff;
                bestSet = candidateSet;
            }

            if (diff <= 0.1) break; // 오차 0.1 이하면 즉시 종료
        }
    }

    // 최종 나열 순서를 완벽하게 무작위로 만들기 위해 한 번 더 섞음
    const finalShuffledSet = shuffleArray(bestSet);

    // 결과 렌더링
    renderProblems(finalShuffledSet);
    
    // 최종 평균 계산
    const finalSum = finalShuffledSet.reduce((sum, p) => sum + p.difficulty, 0);
    const finalAvg = (finalSum / targetCount).toFixed(2);

    // 메시지 출력
    if (targetAvg === 'all') {
        messageArea.textContent = `${targetCount}개의 문제가 랜덤으로 추출되었습니다. (세트 실제 평균: ${finalAvg})`;
    } else {
        const diffLabelMap = { '1.5': '하', '2.0': '중', '2.5': '상' };
        messageArea.textContent = `문제 셋 난이도 [${diffLabelMap[targetAvg]}]에 맞춰 ${targetCount}개의 최적 문제가 추출되었습니다. (세트 실제 평균: ${finalAvg})`;
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
        card.className = "block bg-white border border-gray-200 rounded-lg p-5 shadow hover:shadow-lg hover:border-blue-400 transition duration-200 cursor-pointer overflow-hidden";
        
        // 카드 내부 HTML
        card.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <div class="flex items-center gap-2">
                    <span class="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded">${sectionText}</span>
                    <span class="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded border border-gray-200">${problem.name}</span>
                </div>
                <span class="text-sm font-medium text-gray-500 whitespace-nowrap">난이도: ${problem.difficulty} (${diffText[problem.difficulty]})</span>
            </div>
            <h3 class="text-lg font-bold text-gray-800 mb-2 truncate" title="${problem.title}">
                ${index + 1}. ${problem.title}
            </h3>
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
