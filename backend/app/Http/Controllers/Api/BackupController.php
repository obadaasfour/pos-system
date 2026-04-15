<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Symfony\Component\Process\Process;

class BackupController extends Controller
{
    /**
     * Generate and download a SQL backup of the database.
     */
    public function download()
    {
        $dbHost = env('DB_HOST', '127.0.0.1');
        $dbName = env('DB_DATABASE', 'pos_db');
        $dbUser = env('DB_USERNAME', 'root');
        $dbPass = env('DB_PASSWORD', '');
        
        $filename = "pos_backup_" . date('Y-m-d_H-i-s') . ".sql";
        
        // Path to mysqldump on XAMPP Windows
        $mysqldumpPath = 'C:\\xampp\\mysql\\bin\\mysqldump.exe';
        
        // Build the command array
        // Note: mysqldump handles empty password fine with --password=
        $command = [
            $mysqldumpPath,
            "--user={$dbUser}",
            "--password={$dbPass}",
            "--host={$dbHost}",
            $dbName
        ];

        try {
            // Execute command and capture output
            $process = new Process($command);
            $process->run();

            if (!$process->isSuccessful()) {
                return response()->json([
                    'message' => 'فشل في إنشاء النسخة الاحتياطية.',
                    'error' => $process->getErrorOutput()
                ], 500);
            }

            $sqlContent = $process->getOutput();
            
            return response($sqlContent)
                ->withHeaders([
                    'Content-Type' => 'application/sql',
                    'Content-Disposition' => "attachment; filename=\"{$filename}\"",
                    'Cache-Control' => 'no-cache, no-store, must-revalidate',
                    'Pragma' => 'no-cache',
                    'Expires' => '0',
                ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'حدث خطأ تقني أثناء التصدير.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
