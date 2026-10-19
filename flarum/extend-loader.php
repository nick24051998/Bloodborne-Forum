<?php

/*
 * Wird nach /opt/flarum/extend.php gemountet und lädt flarum/extend.php über das Verzeichnis
 * /bbforum. Eine einzeln gemountete Datei sähe der Container nach einem git pull erst nach einem
 * Neustart (git ersetzt die Datei, die Einbindung zeigt weiter auf die alte); über das Verzeichnis
 * gilt die neue Fassung sofort (nach spätestens einer Minute, so lange cacht PHP die Datei).
 */

return require '/bbforum/extend.php';
