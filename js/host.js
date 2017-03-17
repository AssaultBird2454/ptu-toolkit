/**
 * Scripts for GM Client
 * @author Will Stephenson
 */

var gm_data = {};
var battle = {};
var currentView = 0;

/**
 * Receives commands/messages
 */
function onUpdate() {

    // Check for incoming requests
    receiveMessages("host:" + host_id, function (data) {
        $.each(data, function (message) {
            /*
                Snackbar Alert Received
             */
            if (this.type == "alert"){
                doToast(message["content"]);
            }
            /*
                Send Pokemon Data
             */
            else if (this.type == "pokemon_get") {
                var msg = {
                    "type": "pokemon",
                    "pokemon": gm_data["pokemon"][this.pokemon_id]
                };
                sendMessage(this.from, JSON.stringify(msg));
            }
            /*
                Send Pokemon List
             */
            else if (this.type == "pokemon_list") {
                var msg1 = {
                    "type": "pokemon_list",
                    "pokemon": gm_data["pokemon"]
                };
                sendMessage(this.from, JSON.stringify(msg1));
            }
            /*
                Add Pokemon to Battle
             */
            else if (this.type == "battle_add") {

                var pokemon_id = this.pokemon, client_id = this.from;

                $.each(battle, function (id, json) {
                    sendMessage(json["client_id"], JSON.stringify({
                        "type": "battle_added",
                        "pokemon_id": pokemon_id,
                        "pokemon_name": gm_data["pokemon"][pokemon_id]["name"]
                    }));

                    sendMessage(client_id, JSON.stringify({
                        "type": "battle_added",
                        "pokemon_id": id,
                        "pokemon_name": gm_data["pokemon"][id]["name"]
                    }));
                });

                battle[this.pokemon] = {
                    "client_id": this.from,
                    "stage_atk": this.stage_atk,
                    "stage_def": this.stage_def,
                    "stage_spatk": this.stage_spatk,
                    "stage_spdef": this.stage_spdef,
                    "stage_speed": this.stage_speed,
                    "stage_acc": this.stage_acc,
                    "stage_eva": this.stage_eva
                };

                sendMessage(client_id, JSON.stringify({
                    "type": "battle_added",
                    "pokemon_id": pokemon_id,
                    "pokemon_name": gm_data["pokemon"][pokemon_id]["name"]
                }));

                doToast(gm_data["pokemon"][this.pokemon]["name"] + " Appears!");

                renderInit();
            }
            /*
                Update Field Received
             */
            else if (this.type == "pokemon_update") {
                gm_data["pokemon"][this.pokemon][this.field] = this.value;

                if (this.field == "health") {
                    var max_hp = gm_data["pokemon"][this.pokemon]['level'] + gm_data["pokemon"][this.pokemon]['hp'] * 3 + 10;
                    var w = Math.floor((gm_data["pokemon"][this.pokemon]['health'] / max_hp) * 100);

                    $("[data-name='"+this.pokemon+"']").find(".progress-bar").css("width", w + "%");

                    sendMessage(battle[this.pokemon]["client_id"], JSON.stringify({
                        "type": "health",
                        "value": this.value
                    }));
                }
            }
            /*
                Update Combat Stage Received
             */
            else if (this.type == "pokemon_setcs") {
                battle[this.pokemon][this.field] = this.value;
            }
            /*
                Attack Received
             */
            else if (this.type == "battle_move") {
                performMove(this.move, this.target, this.dealer);
            }
            /*
                Manual Damage Received
             */
            else if (this.type == "battle_damage") {
                damagePokemon(this.target, this.moveType, this.isSpecial, this.damage);
            }
        });
    });

    // Recursion
    setTimeout(onUpdate, 500);
}

/**
 * Generates the Pokemon battle, primarilly the health visual
 */
function renderInit() {
    var html = '';

    $.each(battle, function (id, data) {
        var max_hp = gm_data["pokemon"][id]['level'] + gm_data["pokemon"][id]['hp'] * 3 + 10;
        var w = Math.floor((gm_data["pokemon"][id]['health'] / max_hp) * 100);

        if (w > 100)
            console.log("Warning: Pokemon with ID " + id + " has hit points above its max: " +
                gm_data["pokemon"][id]['health'] + "/" + max_hp);

        html += '<div class="col-md-6 col-md-offset-3 pokemon" data-name="'+id+'">' +
            '<h2 class="name">'+gm_data["pokemon"][id]["name"]+'</h2>' +
            '<div class="progress" data-hp="'+gm_data["pokemon"][id]["hp"]+'" data-max-hp="'+gm_data["pokemon"][id]["max_hp"]+'">' +
            '<div class="progress-bar progress-bar-warning" role="progressbar" aria-valuenow="'+w+'" aria-valuemin="0" aria-valuemax="100" style="width: '+w+'%;"></div>' +
            '</div>' +
            '</div>';
    });

    $("#view-holder").html(html);
}

function changeGMView(view) {
    if (view == 0) {
        renderInit();
    }
    else if (view == 1) {
        $("#view-holder").html($("#body-pokemon").html());
    }
    else if (view == 2) {
        $("#view-holder").html($("#body-settings").html());
    }

    currentView = view;
}

/**
 * Used when a GM ID is submitted
 */
function GMID() {
    // Store selected GM ID
    host_id = $("#battle-id").val();

    // Update display
    $("#display-gmid").html(host_id);
    $(".content-init").css("display", "none");
    $(".content-select").css("display", "inline");
    onUpdate();
}

function newGM() {
    // Update display
    $(".content-select").css("display", "none");
    onUpdate();

    //New blank gm_data object
    gm_data = {characters:{},pokemon:{},settings:{}};
}

function selectGM() {
    // Update display
    var ulAnchorElem = document.getElementById('uploadAnchor');
    ulAnchorElem.click();
}

function loadGM(){
  {
    if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
      alert('The File APIs are not fully supported in this browser.');
      return;
    }

    input = document.getElementById('uploadAnchor');
    if (!input) {
      alert("Um, couldn't find the fileinput element.");
    }
    else if (!input.files) {
      alert("This browser doesn't seem to support the `files` property of file inputs.");
    }
    else if (!input.files[0]) {
      alert("Please select a file before clicking 'Load'");
    }
    else {
      file = input.files[0];
      fr = new FileReader();
		  fr.onload = (function (theFile) {
			     return function (e) {
				         //console.log('e readAsText = ', e);
				         //console.log('e readAsText target = ', e.target);
				         try {
					              json = JSON.parse(e.target.result);
                        $(".content-select").css("display", "none");
                        onUpdate();
                        gm_data = json;
				         } catch (ex) {
					              alert('ex when trying to parse json = ' + ex);
				         }
		      };
		  })(file);
		  fr.readAsText(file);
    }
  }
}

function saveGM() {
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gm_data));
    var dlAnchorElem = document.getElementById('downloadAnchor');
    dlAnchorElem.setAttribute("href",     dataStr     );
    dlAnchorElem.setAttribute("download", "GMData.json");
    dlAnchorElem.click();
}

/**
 * Handle a move request and dish out effects
 * @param moveName The name of the move used
 * @param target_id The Pokemon id of the target
 * @param dealer_id The Pokemon id of the user
 */
function performMove(moveName, target_id, dealer_id) {
    doToast(gm_data["pokemon"][dealer_id]["name"] + " used " + moveName + "!");

    $.getJSON("/api/v1/moves/"+moveName, function (move) {
        var acRoll = roll(1, 20, 1) + battle[dealer_id]["stage_acc"];
        var crit = 20, evade = 0;

        if (target_id != "other") {
            //TODO: get evade
        }

        if (move.hasOwnProperty('AC') && acRoll < parseInt(move["AC"]) + evade) {
            doToast("It missed!");
            return;
        }

        if (move["Class"] == "Physical" || move["Class"] == "Special") {
            var db = parseInt(move["DB"]);

            var types = gm_data["pokemon"][dealer_id]["type"].split(" / ");

            if (types[0] == move["Type"] || (types.length > 1 && types[1] == move["type"]))
                db += 2;

            if (db > 28) db = 28;

            var rolledDmg = rollDamageBase(db, acRoll >= crit ? 2 : 1);
            var damage = 0;

            if (acRoll >= crit)
                doToast("Critical hit!");

            if (move["Class"] == "Physical") {
                damage = rolledDmg +
                    gm_data["pokemon"][dealer_id]["atk"] * getStageMultiplier(battle[dealer_id]["stage_atk"]);
                if (target_id != "other")
                    damage -= gm_data["pokemon"][target_id]["def"] * getStageMultiplier(battle[target_id]["stage_def"]);
            }
            else if (move["Class"] == "Special") {
                damage = rolledDmg * (acRoll >= crit ? 2 : 1) +
                    gm_data["pokemon"][dealer_id]["spatk"] * getStageMultiplier(battle[dealer_id]["stage_spatk"]);
                if (target_id != "other")
                    damage -= gm_data["pokemon"][target_id]["spdef"] * getStageMultiplier(battle[target_id]["stage_spdef"]);
            }

            if (target_id == "other") {
                doToast("OUTGOING DAMAGE = " + damage);
            }
            else {
                damagePokemon(target_id, move["Type"].toLowerCase(), move["Class"] == "Special", damage)
            }
        }
    });
}

/**
 * Inflict incoming damage onto a specified Pokemon
 * @param target_id The ID of the Pokemon taking damage
 * @param moveType The move type
 * @param moveIsSpecial True when special, false when physical
 * @param damage The amount of damage
 */
function damagePokemon(target_id, moveType, moveIsSpecial, damage) {
    if (moveIsSpecial)
        damage -= gm_data["pokemon"][target_id]["spdef"] * getStageMultiplier(battle[target_id]["stage_spdef"]);
    else
        damage -= gm_data["pokemon"][target_id]["def"] * getStageMultiplier(battle[target_id]["stage_def"]);

    $.getJSON("/api/v1/types", function (json) {
        var target_types = gm_data["pokemon"][target_id]["type"].split(" / ");

        var effect1 = json[moveType][target_types[0].toLowerCase()];
        var effect2 = 1;

        if (target_types.length > 1)
            effect2 = json[moveType][target_types[1].toLowerCase()];

        damage = damage * effect1 * effect2;

        if (effect1 * effect2 == 0)
            doToast("No effect!");
        else if (effect1 * effect2 >= 2)
            doToast("It's super effective!");
        else if (effect1 * effect2 < 1)
            doToast("It's not very effective.");

        // Subtract health
        gm_data["pokemon"][target_id]["health"] -= damage;

        if (gm_data["pokemon"][target_id]["health"] <= 0) {
            doToast(gm_data["pokemon"][target_id]["name"] + " fainted!");
            gm_data["pokemon"][target_id]["health"] = 0;
        }

        // Update health bar
        var max_hp = gm_data["pokemon"][target_id]['level'] + gm_data["pokemon"][target_id]['hp'] * 3 + 10;
        var w = Math.floor((gm_data["pokemon"][target_id]['health'] / max_hp) * 100);

        $("[data-name='"+target_id+"']").find(".progress-bar").css("width", w + "%");

        // Update Player client
        sendMessage(battle[target_id]["client_id"], JSON.stringify({
            "type": "health",
            "value": gm_data["pokemon"][target_id]['health']
        }));
    });
}

/**
 * Initialize Add/Edit Pokemon
 */
$(function () {
    $.getJSON("api/v1/types", function(json) {
        $.each(json, function (k, v) {
            document.getElementById("addmon-type1").innerHTML += "<option>" + k + "</option>";
            document.getElementById("addmon-type2").innerHTML += "<option>" + k + "</option>";
        })
    });

    $.getJSON("data/natures.json", function(json) {
        $.each(json, function (k, v) {
            document.getElementById("addmon-nature").innerHTML += "<option>" + k + "</option>";
        })
    });

    $.getJSON("data/moves.json", function(json) {
        var html = "<option></option>";

        $.each(json, function (k, v) {
            html += "<option>" + k + "</option>";
        });

        $("#addmon-moves").find("select").each(function () {
            $(this).html(html);
        });
    });

    $.getJSON("data/abilities.json", function(json) {
        var html = "<option></option>";

        $.each(json, function (k, v) {
            html += "<option>" + k + "</option>";
        });

        $("#addmon-abilities").find("select").each(function () {
            $(this).html(html);
        });
    });
});

/**
 * Save Pokemon
 */
$("#btn-addmon").click(function () {

    var form = $(".form-addmon");
    var isValid = true;

    // Validate Form
    form.find("[required]").each(function () {
        if ($(this).val() == null || $(this).val() == "" || $(this).val() == " ") {
            $(this).parent().addClass("has-error");
            isValid = false;
        }
        else
            $(this).parent().removeClass("has-error");
    });

    if (!isValid) {
        doToast("One or more fields were not filled out properly. Please try again.")
    }
    else {
        var data = {}, moves = [], abil = [];

        form.find("input, select").each(function () {
            if (!$(this).parent().hasClass("addmon-moves") && !$(this).parent().hasClass("addmon-abilities"))
                data[$(this).attr("data-field")] = $(this).val();
        });

        var i = 0;

        form.find(".addmon-moves select").each(function () {
            moves[i] = $(this).val();
            i++;
        });

        i = 0;

        form.find(".addmon-abilities select").each(function () {
            abil[i] = $(this).val();
            i++;
        });

        data["moves"] = moves;
        data["abilities"] = abil;

        var pmon_id = $("#addmon-id").val();

        if (pmon_id == "") {
            pmon_id = generatePmonId();
        }

        gm_data["pokemon"][pmon_id] = data;

        doToast(gm_data["pokemon"][pmon_id]["name"] + " was added");

        //TODO: dismiss modal
    }
});

function generatePmonId() {
    var pmon_id = "";

    // Create ID for Pokemon
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    //TODO: check if id exists
    for( var j=0; j < 3; j++ )
        pmon_id += chars.charAt(Math.floor(Math.random() * chars.length));

    return pmon_id;
}
