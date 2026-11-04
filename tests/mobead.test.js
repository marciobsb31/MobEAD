const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function createApp() {
    const context = {
        $: {
            map: (items, mapper) => items.map(mapper),
        },
        ko: {
            observable(initialValue) {
                let value = initialValue;
                return function observable(nextValue) {
                    if (arguments.length > 0) {
                        value = nextValue;
                    }
                    return value;
                };
            },
            observableArray(initialValue) {
                let value = initialValue || [];
                return function observableArray(nextValue) {
                    if (arguments.length > 0) {
                        value = nextValue;
                    }
                    return value;
                };
            },
            computed({ read }) {
                return read;
            },
            applyBindings(viewModel) {
                context.viewModel = viewModel;
            },
        },
    };
    context.window = context;
    vm.createContext(context);

    for (const file of ['Scripts/mobEAD.dataAccess.js', 'Scripts/mobEAD.js']) {
        const source = fs.readFileSync(path.join(root, file), 'utf8');
        vm.runInContext(source, context, { filename: file });
    }

    return context.viewModel;
}

test('carrega as provas disponíveis e inicia sem prova selecionada', () => {
    const app = createApp();

    assert.equal(app.Tests().length, 2);
    assert.equal(app.Tests()[0].Exam, 'ITIL v3 Foundation');
    assert.equal(app.CurrentTest(), null);
});

test('seleciona uma prova e navega sem ultrapassar a última questão', () => {
    const app = createApp();
    const exam = app.Tests()[0];

    app.selectTest(exam);
    assert.equal(app.CurrentTest(), exam);
    assert.equal(exam.Question().QuestionNumber, 0);

    exam.nextQuestion();
    assert.equal(exam.Question().QuestionNumber, 1);
    exam.nextQuestion();
    exam.nextQuestion();
    assert.equal(exam.CurrentQuestion(), 2);

    exam.previousQuestion();
    assert.equal(exam.Question().QuestionNumber, 1);
});

test('alternativa selecionada pode ser marcada e desmarcada', () => {
    const app = createApp();
    const question = app.Tests()[0].Questions()[0];

    question.selectAlternative(1);
    assert.equal(question.NumberAnswered(), 1);
    question.selectAlternative(1);
    assert.equal(question.NumberAnswered(), 0);
});

test('aprova a prova quando o número mínimo de respostas corretas é atingido', () => {
    const app = createApp();
    const exam = app.Tests()[0];

    exam.Questions().forEach((question) => {
        question.selectAlternative(question.CorrectAlternativeNumber);
    });
    exam.endTest();

    assert.equal(exam.ActualCorrectAmount(), 3);
    assert.equal(exam.Result(), true);
    assert.equal(exam.ShowResult(), true);
});

test('reprova a prova quando o número mínimo de respostas corretas não é atingido', () => {
    const app = createApp();
    const exam = app.Tests()[0];

    exam.Questions().forEach((question) => question.selectAlternative(4));
    exam.endTest();

    assert.equal(exam.ActualCorrectAmount(), 0);
    assert.equal(exam.Result(), false);
    assert.equal(exam.ShowResult(), true);
});

test('os arquivos locais referenciados pelo HTML existem', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const localAssets = [
        ...html.matchAll(/(?:src|href)="([^"]+)"/g),
    ]
        .map((match) => match[1])
        .filter((asset) => !/^(?:https?:)?\/\//.test(asset) && !asset.startsWith('#'));

    assert.ok(localAssets.length > 0);
    for (const asset of localAssets) {
        assert.ok(
            fs.existsSync(path.join(root, asset)),
            `Arquivo local referenciado não encontrado: ${asset}`,
        );
    }
});
