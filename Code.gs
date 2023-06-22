let webhook = ""; // e.g https://discord.com/api/webhooks/**/**

let
    title = "AusTech Application",
    shortDescription = "",
    tinyImage = "", // e.g https://imgur.com/bfj8NYm.png
    bigImage = "",
    colour = "", // e.g #1f8b4c
    mention = "", // e.g <@&1105435087601934420>
    type = "embed";

const splitQuestions = 8,
    bonusFeatures = {
        convert2Link: 'ON',
        convert2Mention: 'ON',
        shortenURL: 'OFF',
        link2response: 'OFF'
    };

const form = FormApp.getActiveForm(),
    allResponses = form.getResponses(),
    latestResponse = allResponses[allResponses.length - 1];
let response, items = [],
    finalScore = 0;
try {
    response = latestResponse.getItemResponses()
} catch (error) {
    throw "No Responses found in your form."
}
for (var i = 0; i < response.length; i += 1) {
    let question = response[i].getItem().getTitle(),
        answer = response[i].getResponse();
    if (form.isQuiz()) {
        let quizQuestions = latestResponse.getGradableItemResponses();
        for (var j = 0; j < quizQuestions.length; j += 1) {
            var score = quizQuestions[j].getScore();
            finalScore = finalScore + score;
            answer = !answer.includes('points)') ? `${ answer } (${ score } points)` : answer
        }
    }
    if (answer == "") {
        continue
    }
    if (bonusFeatures.link2response == 'ON' && i == 0) {
        const responseURL = latestResponse.getEditResponseUrl();
        const shortenRes = UrlFetchApp.fetch(`https://vurl.com/api.php?url=${encodeURIComponent(responseURL)}`).getContentText();
        items.push({
            "name": "View Response",
            "value": shortenRes
        })
    }
    items.push({
        "name": question,
        "value": answer
    });

    function data(item) {
        const linkValidate = /(https?:\/\/(?:www\.|(?!www))[^\s\.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,})/gi;
        if (bonusFeatures.convert2Mention == 'ON' && !isNaN(item.value) && item.value.length == 18) {
            item.value = `<@!${item.value }>`
        }
        if (bonusFeatures.convert2Link == 'ON' && linkValidate.test(item.value)) {
            item.value = `<${item.value }>`
        }
        if (Array.isArray(item.value)) {
            if (bonusFeatures.shortenURL == 'ON') {
                item.value = item.value.map(i => i.length == 33 ? `https://drive.google.com/file/d/${ i }` : i)
            } else {
                item.value = item.value.map(i => i.length == 33 ? `https://drive.google.com/file/d/${ i }` : i).join('\n')
            }
        }
        if (bonusFeatures.shortenURL == 'ON' && linkValidate.test(item.value)) {
            if (Array.isArray(item.value)) {
                item.value = item.value.map(i => `<${UrlFetchApp.fetch(`https://vurl.com/api.php?url=${encodeURIComponent(i)}`).getContentText()}>`).join('\n')
            } else {
                item.value = item.value.match(linkValidate).map(i => `<${UrlFetchApp.fetch(`https://vurl.com/api.php?url=${encodeURIComponent(i)}`).getContentText()}>`).join('\n')
            }
        }
        console.log(item.value);
        return {
            "name": item.name,
            "value": item.value
        }
    }
}
let splits = {
    count: 0,
    sidebar: colour ? parseInt(colour.substr(1), 16) : Math.floor(Math.random() * 16777215)
};

function submission(e) {
    function chunkArray(myArray, chunk_size) {
        var index = 0;
        var arrayLength = myArray.length;
        var tempArray = [];
        for (index = 0; index < arrayLength; index += chunk_size) {
            myChunk = myArray.slice(index, index + chunk_size);
            tempArray.push(myChunk)
        }
        return tempArray
    }
    if (type.toLowerCase() == "text") {
        for (const res of chunkArray(items.map(data), splitQuestions)) {
            splits.count += 1;
            const text = {
                "method": "post",
                "headers": {
                    "Content-Type": "application/json"
                },
                "muteHttpExceptions": true,
                "payload": JSON.stringify({
                    "content": `${splits.count>1?'':mention?mention:''}${splits.count>1?'':title?`__**${ title }**__`:`__**${form.getTitle()}**__`}\n\n${shortDescription?`${ shortDescription }\n\n${res.map(r=>`> **${r.name }**\n${r.value }`).join('\n\n')}`:res.map(r=>`> **${r.name }**\n${r.value }`).join('\n\n')}`
                })
            };
            UrlFetchApp.fetch(webhook, text)
        }
    } else if (type.toLowerCase() == "embed") {
        var embeds = [];
        for (const res of chunkArray(items.map(data), splitQuestions)) {
            splits.count += 1;
            embeds.push({
                "title": splits.count > 1 ? null : title ? title : form.getTitle(),
                "description": shortDescription ? shortDescription : null,
                "fields": res,
                "thumbnail": {
                    url: tinyImage ? encodeURI(tinyImage) : null
                },
                "image": {
                    url: bigImage ? encodeURI(bigImage) : null
                },
                "color": splits.sidebar,
                "timestamp": new Date().toISOString()
            })
        }
        const embed = {
            "method": "post",
            "headers": {
                "Content-Type": "application/json"
            },
            "muteHttpExceptions": true,
            "payload": JSON.stringify({
                "content": mention,
                "embeds": embeds
            })
        };
        UrlFetchApp.fetch(webhook, embed)
    } else {
        throw "TYPE can only be TEXT or EMBED"
    }
}

function createTrigger() {
    const triggers = ScriptApp.getProjectTriggers();
    for (const trigger of triggers) {
        try {
            ScriptApp.deleteTrigger(trigger)
        } catch (e) {};
        Utilities.sleep(1000)
    }
    ScriptApp.newTrigger("submission").forForm(form).onFormSubmit().create()
}
