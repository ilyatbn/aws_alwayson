package main

import (
	"net/http"
	"os"
	"os/exec"
	"log"
	"fmt"
	"strings"
	"io"
	"io/ioutil"
	"errors"
	"encoding/json"
	"gopkg.in/ini.v1"
)

type Credentials struct {
    AccessKeyId string
	SecretAccessKey string
	SessionToken string
	Expiration string
}


func getLogin() (string, error) {
	getnet := fmt.Sprintf("$(netstat -np | grep 31339 | grep ESTABLISHED |grep -v %v| awk '{print $7}' | awk -F'/' '{print $1}')", os.Getpid())
	cmd := fmt.Sprintf("if [[ ! -z %v ]]; then ps -up %v | awk '{print $1}' | grep -v USER;fi;", getnet, getnet)
	out, err := exec.Command("bash","-c", cmd).Output()
	if err != nil {
		log.Printf("execution error:%v\n", err)
		return "", err
	}
	return strings.TrimSuffix(string(out), "\n"), nil
}

func updateCredFile(creds Credentials) error {
	var cfg *ini.File
	user,err := getLogin()
	if err != nil {
		log.Printf("could not get username from user:%v", err)
		return err
	}
	filePath := fmt.Sprintf("/home/%v/.aws/credentials",user)
	cfg, err = ini.Load(filePath)
    if err != nil {
		log.Printf("failed to read file: %v", err)
		cfg = ini.Empty()
		_ = os.MkdirAll(fmt.Sprintf("/home/%v/.aws",user), os.ModePerm)
    }
	
	cfg.DeleteSection("default")
	cfg.NewSection("default")
	cfg.Section("default").Key("aws_access_key_id").SetValue(creds.AccessKeyId)
	cfg.Section("default").Key("aws_secret_access_key").SetValue(creds.SecretAccessKey)
	cfg.Section("default").Key("aws_session_token").SetValue(creds.SessionToken)
	cfg.Section("default").Key("aws_session_expiration").SetValue(creds.Expiration)
	cfg.SaveTo(filePath)
	log.Printf("updated %v", filePath)
	return nil
}

func processUpdate(w http.ResponseWriter, r *http.Request) {
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		log.Printf("could not read body: %s\n", err)
	}
	creds := Credentials{}
    json.Unmarshal([]byte(body), &creds)
	err = updateCredFile(creds)
	var response string
	if err != nil {
		response = fmt.Sprintf("could not update file:%v", err)
	} else {
		response = "ok"
	}
	w.Header().Set("Connection", "close")
	io.WriteString(w, response)
	
}

func main(){
	file, err := os.OpenFile("/var/log/awsalwayson.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0666)
    if err != nil {
        log.Fatal(err)
    }
    log.SetOutput(file)
	log.Println("service started")
	mux := http.NewServeMux()
	mux.HandleFunc("/update", processUpdate)

	err = http.ListenAndServe("127.0.0.1:31339", mux)

	if errors.Is(err, http.ErrServerClosed) {
		log.Printf("server closed\n")
	} else if err != nil {
		log.Printf("error starting server: %s\n", err)
		os.Exit(1)
	}
}