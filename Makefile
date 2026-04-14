all: install

install: aws_cli aws_sam_cli pulumi uv

run: lambda-run

aws_cli:
	curl -sL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
	unzip awscliv2.zip

	rm -rf ~/.aws-cli
	./aws/install -i ~/.aws-cli -b ~/.local/bin

	rm -f awscliv2.zip
	rm -rf aws

aws_sam_cli:
	curl -sL https://github.com/aws/aws-sam-cli/releases/latest/download/aws-sam-cli-linux-x86_64.zip -o aws-sam-cli-linux-x86_64.zip
	unzip aws-sam-cli-linux-x86_64.zip -d sam-installation

	rm -rf ~/.aws-sam-cli
	./sam-installation/install -i ~/.aws-sam-cli -b ~/.local/bin

	rm -f aws-sam-cli-linux-x86_64.zip
	rm -rf sam-installation

pulumi:
	curl -fsSL https://get.pulumi.com | sh

uv:
	curl -LsSf https://astral.sh/uv/install.sh | sh

lambda-run:
	sam local invoke -t template.yaml -e event.json
