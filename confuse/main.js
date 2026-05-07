const keywordsArea = document.getElementById('keywords');
const sourceTextArea = document.getElementById('sourceText');
const targetTextArea = document.getElementById('targetText');
const convertButton = document.getElementById('convert');
const convertBackButton = document.getElementById('convertBack');

let mapping = new Map();
let lastKeywords = '';

function updateMappingIfNeeded(keywords) {
    if (lastKeywords === keywords) {
        return;
    }

    mapping.clear();

    keywords.split('\n').forEach((keyword, index) => {
        keyword = keyword.trim();
        if (keyword !== '') {
            const replacement = `T${index + 1}_`;
            mapping.set(replacement, keyword);
        }
    });

    lastKeywords = keywords;
}

convertButton.addEventListener('click', () => {
    let keywords = keywordsArea.value;
    let sourceText = sourceTextArea.value;

    updateMappingIfNeeded(keywords);

    mapping.forEach((original, replacement) => {
        const regex = new RegExp('\\b' + original + '\\b', 'g');
        sourceText = sourceText.replace(regex, replacement);
    });

    targetTextArea.value = sourceText;
});

convertBackButton.addEventListener('click', () => {
    let targetText = targetTextArea.value;

    mapping.forEach((original, replacement) => {
        const regex = new RegExp(replacement, 'g');
        targetText = targetText.replace(regex, original);
    });

    sourceTextArea.value = targetText;
});

const i18n = i18next.createInstance();
i18n
    .use(i18nextBrowserLanguageDetector)
    .init({
        fallbackLng: 'en',
        resources: {
            en: {
                translation: {
                title: 'Text Obfuscation Converter',
                    keywords: 'Keyword List',
                    sourceText: 'Source Text',
                    convert: 'Convert',
                    convertBack: 'Convert Back',
                    targetText: 'Target Text',
                    keywordsPlaceholder: 'Enter keywords, one per line, for example:\nTBL_ORDER\norder_id\norder_date\nuser_id\nuser_name\nprice\npaid',
                    sourceTextPlaceholder: 'Enter source text, for example:\nWrite an SQL statement to group the TBL_ORDER table by "user_id, order_date" and find the record with the highest price for the same user_id and order_date',
                    targetTextPlaceholder: 'The target text will be displayed here, for example:\nWrite an SQL statement to group the T1_ table by "T4_, T3_" and find the record with the highest T6_ for the same T4_ and T3_'
                }
            },
            zh: {
                translation: {
                    title: '文本混淆',
                    keywords: '关键字列表',
                    sourceText: '源文本',
                    convert: '转换',
                    convertBack: '转换回去',
                    targetText: '目标文本',
                    keywordsPlaceholder: '输入关键字，每行一个，例如：\nTBL_ORDER\norder_id\norder_date\nuser_id\nuser_name\nprice\npaid',
                    sourceTextPlaceholder: '输入源文本，例如：\n写一条SQL语句把数据库表TBL_ORDER 中按 “user_id， order_date分组，找出相同user_id，相同order_date最大的price记录"',
                    targetTextPlaceholder: '目标文本将显示在这里，例如：\n写一条SQL语句把数据库表T1_ 中按 “T4_， T3_分组，找出相同T4_，相同T3_最大的T6_记录"'
                }
            },
            ja: {
                translation: {
                    title: 'テキスト難読化コンバータ',
                    keywords: 'キーワードリスト',
                    sourceText: 'ソーステキスト',
                    convert: '変換',
                    convertBack: '戻す',
                    targetText: 'ターゲットテキスト',
                    keywordsPlaceholder: 'キーワードを入力してください。1行に1つずつ。例：\nTBL_ORDER\norder_id\norder_date\nuser_id\nuser_name\nprice\npaid',
                    sourceTextPlaceholder: 'ソーステキストを入力してください。例：\nデータベーステーブルTBL_ORDERを"user_id、order_date"でグループ化し、同じuser_idとorder_dateの最大のpriceレコードを見つけるSQLステートメントを記述する',
                    targetTextPlaceholder: 'ターゲットテキストはここに表示されます。例：\nデータベーステーブルT1_を"T4_、T3_"でグループ化し、同じT4_とT3_の最大のT6_レコードを見つけるSQLステートメントを記述する'
                }
            }
        }
    })
	.then(() => {
		document.querySelector('h1').textContent = i18n.t('title');
		document.querySelector('label[for="keywords"]').textContent = i18n.t('keywords');
		document.querySelector('label[for="sourceText"]').textContent = i18n.t('sourceText');
		document.querySelector('#convert').textContent = i18n.t('convert');
		document.querySelector('#convertBack').textContent = i18n.t('convertBack');
		document.querySelector('label[for="targetText"]').textContent = i18n.t('targetText');
		document.querySelector('#keywords').placeholder = i18n.t('keywordsPlaceholder');
		document.querySelector('#sourceText').placeholder = i18n.t('sourceTextPlaceholder');
		document.querySelector('#targetText').placeholder = i18n.t('targetTextPlaceholder');
		document.title = i18n.t('title');	
	});

					